import { api, getUserId } from "./client";

export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

export type CoachStreamEvent =
  | { type: "tool_start"; id: string; name: string; label: string; input: Record<string, unknown> }
  | { type: "tool_end"; id: string; name: string; ok: boolean }
  | { type: "done"; reply: string; messages: ChatMessage[] }
  | { type: "error"; error: string };

export const getCoachMessages = () => api.get<{ messages: ChatMessage[] }>("/api/coach/messages");

// Streams newline-delimited JSON events as the agent works — tool_start/tool_end
// for each background tool call, then a final "done" (or "error") event. Lets
// the chat UI show live progress instead of a single blocking spinner.
export async function sendCoachMessageStream(
  message: string,
  onEvent: (event: CoachStreamEvent) => void
): Promise<void> {
  const res = await fetch("/api/coach/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": getUserId() },
    body: JSON.stringify({ message }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error((err as any).error ?? "Request failed"), { status: res.status });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as CoachStreamEvent);
    }
  }

  if (buffer.trim()) onEvent(JSON.parse(buffer) as CoachStreamEvent);
}

export const clearCoachMessages = () => api.delete<{ ok: boolean }>("/api/coach/messages");
