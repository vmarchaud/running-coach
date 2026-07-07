import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCoachMessages, sendCoachMessage, ChatMessage } from "../../api/coach";
import { Spinner } from "../shared/Spinner";

function textOf(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

const markdownComponents = {
  p: (props: any) => <p className="mb-2 last:mb-0" {...props} />,
  strong: (props: any) => <strong className="font-semibold" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-4 mb-2 space-y-0.5" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-4 mb-2 space-y-0.5" {...props} />,
  li: (props: any) => <li {...props} />,
  h1: (props: any) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0" {...props} />,
  h2: (props: any) => <h2 className="text-base font-bold mt-3 mb-1 first:mt-0" {...props} />,
  h3: (props: any) => <h3 className="text-sm font-bold mt-2 mb-1 first:mt-0" {...props} />,
  code: (props: any) => <code className="bg-black/30 rounded px-1 py-0.5 text-xs" {...props} />,
  a: (props: any) => <a className="underline text-emerald-400" target="_blank" rel="noreferrer" {...props} />,
};

export function CoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCoachMessages()
      .then(({ messages }) => setMessages(messages))
      .catch(() => setError("Couldn't load your conversation history."))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const { messages: updated } = await sendCoachMessage(text);
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

      <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {loadingHistory && (
          <div className="flex justify-center py-12">
            <Spinner className="w-6 h-6" />
          </div>
        )}

        {!loadingHistory && visibleMessages.length === 0 && (
          <div className="text-center text-neutral-500 py-12">
            <div className="text-4xl mb-3">🏃‍♂️</div>
            <p>Ask me anything — "how was my week?", "am I recovered enough for a long run?", "schedule an easy run for tomorrow".</p>
          </div>
        )}

        {visibleMessages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "self-end bg-emerald-600 text-white whitespace-pre-wrap"
                : "self-start bg-neutral-800 text-neutral-100"
            }`}
          >
            {m.role === "assistant" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {textOf(m.content)}
              </ReactMarkdown>
            ) : (
              textOf(m.content)
            )}
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

      <div className="px-4 py-3 border-t border-neutral-800 flex gap-2 flex-shrink-0">
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
