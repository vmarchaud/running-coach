import { api } from "./client";

export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

export const getCoachMessages = () => api.get<{ messages: ChatMessage[] }>("/api/coach/messages");

export const sendCoachMessage = (message: string) =>
  api.post<{ reply: string; messages: ChatMessage[] }>("/api/coach/chat", { message });
