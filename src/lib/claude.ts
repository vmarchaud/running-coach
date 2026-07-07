import { CF_ACCOUNT_ID, CF_AI_GATEWAY_NAME, CLAUDE_MODEL } from "./config";

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

// BYOK gateway: Anthropic's key lives in the Cloudflare AI Gateway config, so we
// authenticate the gateway call itself with cf-aig-authorization instead of
// sending an Anthropic API key.
export async function callClaude(
  gatewayToken: string,
  messages: ClaudeMessage[],
  opts: { system?: string; tools?: ClaudeTool[]; maxTokens?: number } = {}
): Promise<ClaudeResponse> {
  const url = `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_AI_GATEWAY_NAME}/anthropic/v1/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "cf-aig-authorization": `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages,
      tools: opts.tools,
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude call failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
