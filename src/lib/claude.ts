import { COACH_MODEL } from "./config";

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ClaudeContentBlock =
  | { type: "text"; text: string }
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
// into a "user" message's content array). Workers AI's chat-completions models
// expect OpenAI's shape instead — one standalone "tool" message per result — so we
// translate at the boundary rather than changing what's persisted in D1.
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

export async function callClaude(
  ai: Ai,
  messages: ClaudeMessage[],
  opts: { system?: string; tools?: ClaudeTool[]; maxTokens?: number } = {}
): Promise<ClaudeResponse> {
  const response: any = await ai.run(COACH_MODEL as any, {
    messages: toOpenAiMessages(opts.system, messages),
    tools: toOpenAiTools(opts.tools),
    max_tokens: opts.maxTokens ?? 1024,
  });

  const choice = response?.choices?.[0];
  if (!choice) throw new Error(`Workers AI returned no choices: ${JSON.stringify(response)}`);

  const msg = choice.message;
  const content: ClaudeContentBlock[] = [];
  if (msg.content) content.push({ type: "text", text: msg.content });

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
