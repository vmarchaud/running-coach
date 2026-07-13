import { COACH_MODEL, NVIDIA_BASE_URL } from "./config";

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

export interface ClaudeResponse {
  content: ClaudeContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | string;
}

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

// Our stored message format follows Anthropic's shape (tool_result blocks bundled
// into a "user" message's content array). OpenAI-compatible chat-completions APIs
// expect one standalone "tool" message per result instead — so we translate at
// the boundary rather than changing what's persisted in D1.
function toOpenAiMessages(system: string | undefined, messages: ClaudeMessage[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [];
  if (system) out.push({ role: "system", content: system });

  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }

    if (m.role === "assistant") {
      const text = m.content
        .filter((b): b is Extract<ClaudeContentBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      const toolCalls: OpenAiToolCall[] = m.content
        .filter((b): b is Extract<ClaudeContentBlock, { type: "tool_use" }> => b.type === "tool_use")
        .map((b) => ({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input) } }));

      out.push({
        role: "assistant",
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      });
      continue;
    }

    // role === "user": tool_result blocks become separate "tool" messages
    const toolResults = m.content.filter(
      (b): b is Extract<ClaudeContentBlock, { type: "tool_result" }> => b.type === "tool_result"
    );
    for (const tr of toolResults) {
      out.push({ role: "tool", tool_call_id: tr.tool_use_id, content: tr.content });
    }

    const text = m.content
      .filter((b): b is Extract<ClaudeContentBlock, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    if (text) out.push({ role: "user", content: text });
  }

  return out;
}

function toOpenAiTools(tools?: ClaudeTool[]) {
  return tools?.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

// Some OpenAI-compatible providers (observed with the NVIDIA-hosted endpoint)
// occasionally append trailing bytes after the JSON body even with
// `stream: false`, which makes `res.json()` throw "Unexpected non-whitespace
// character after JSON". Parse the leading JSON object directly instead of
// trusting the whole body to be exactly one value.
function parseChatCompletion(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch (e: any) {
    const firstLine = raw.split("\n")[0]?.trim();
    if (firstLine) {
      try {
        return JSON.parse(firstLine);
      } catch {
        // fall through to the error below
      }
    }
    throw new Error(`NVIDIA response wasn't valid JSON (${e.message}): ${raw.slice(0, 500)}`);
  }
}

export async function callClaude(
  apiKey: string,
  messages: ClaudeMessage[],
  opts: { system?: string; tools?: ClaudeTool[]; maxTokens?: number } = {}
): Promise<ClaudeResponse> {
  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: COACH_MODEL,
      messages: toOpenAiMessages(opts.system, messages),
      tools: toOpenAiTools(opts.tools),
      // Reasoning models like Nemotron burn a large chunk of the token budget
      // on chain-of-thought before ever writing the answer — 1024 was cutting
      // responses off mid-thought (visible as truncated reasoning AND a
      // missing/incomplete final answer on anything non-trivial).
      max_tokens: opts.maxTokens ?? 8192,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`NVIDIA inference call failed ${res.status}: ${await res.text()}`);
  }

  const raw = await res.text();
  const response: any = parseChatCompletion(raw);
  const choice = response?.choices?.[0];
  if (!choice) throw new Error(`NVIDIA API returned no choices: ${JSON.stringify(response)}`);

  const msg = choice.message;
  const content: ClaudeContentBlock[] = [];

  // The Nemotron model "thinks out loud" before its final answer — either via
  // a separate reasoning_content field (the DeepSeek-R1-style convention many
  // OpenAI-compatible reasoning-model hosts use) or one or more inline
  // <think>...</think> blocks anywhere in content (observed: not always at
  // the very start, and sometimes more than one). Always strip every
  // <think>...</think> occurrence from the body regardless of which source we
  // use for the thinking block, so raw reasoning markup never leaks into the
  // visible reply — and only ever push ONE thinking block, preferring
  // reasoning_content, so the same reasoning never shows up twice.
  let bodyText: string = msg.content ?? "";
  const inlineThinking = [...bodyText.matchAll(/<think>([\s\S]*?)<\/think>/gi)].map((m) => m[1].trim());
  bodyText = bodyText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  const reasoning = typeof msg.reasoning_content === "string" ? msg.reasoning_content.trim() : "";
  const thinkingText = reasoning || inlineThinking.join("\n\n");

  if (thinkingText) content.push({ type: "thinking", text: thinkingText });
  if (bodyText) content.push({ type: "text", text: bodyText });

  for (const tc of msg.tool_calls ?? []) {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(tc.function.arguments || "{}");
    } catch {
      // leave input empty if the model produced malformed JSON
    }
    content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
  }

  return { content, stop_reason: msg.tool_calls?.length ? "tool_use" : "end_turn" };
}
