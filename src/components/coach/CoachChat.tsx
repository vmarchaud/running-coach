import { useEffect, useRef, useState } from "react";
import { sendCoachMessage, ChatMessage } from "../../api/coach";
import { Spinner } from "../shared/Spinner";

const STORAGE_KEY = "coachChatHistory";

function textOf(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export function CoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const { messages: updated } = await sendCoachMessage(nextMessages);
      setMessages(updated);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong talking to your coach.");
    } finally {
      setSending(false);
    }
  };

  const visibleMessages = messages.filter((m) => textOf(m.content).trim().length > 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Coach</h1>
        <p className="text-neutral-400 text-sm mt-0.5">
          Ask about your training, recovery, or have it schedule your next session.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {visibleMessages.length === 0 && (
          <div className="text-center text-neutral-500 py-12">
            <div className="text-4xl mb-3">🏃‍♂️</div>
            <p>Ask me anything — "how was my week?", "am I recovered enough for a long run?", "schedule an easy run for tomorrow".</p>
          </div>
        )}

        {visibleMessages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap text-sm leading-relaxed ${
              m.role === "user"
                ? "self-end bg-emerald-600 text-white"
                : "self-start bg-neutral-800 text-neutral-100"
            }`}
          >
            {textOf(m.content)}
          </div>
        ))}

        {sending && (
          <div className="self-start bg-neutral-800 rounded-2xl px-4 py-3">
            <Spinner className="w-4 h-4" />
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-neutral-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message your coach..."
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="bg-emerald-500 text-white rounded-xl px-4 py-2.5 font-semibold disabled:opacity-50 active:scale-95 transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}
