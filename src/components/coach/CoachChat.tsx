import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCoachMessages, sendCoachMessageStream, clearCoachMessages, ChatMessage } from "../../api/coach";
import { Spinner } from "../shared/Spinner";
import { Button } from "../shared/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "../../lib/i18n/context";
import { markdownTableWrapper } from "../../lib/markdownTableWrapper";

function textOf(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function thinkingOf(content: ChatMessage["content"]): string {
  if (typeof content === "string") return "";
  return content
    .filter((b): b is Extract<typeof b, { type: "thinking" }> => b.type === "thinking")
    .map((b) => b.text)
    .join("\n\n");
}

// Mirrors src/lib/coachAgent.ts's TOOL_LABELS so persisted tool calls read the
// same as the live "Checking recent trainings..." labels shown while streaming.
const TOOL_LABELS: Record<string, string> = {
  get_recent_trainings: "Checking recent trainings",
  get_training_detail: "Pulling up training detail",
  get_planned_trainings: "Checking your training calendar",
  get_hrv: "Checking HRV",
  get_health_metrics: "Checking health metrics",
  get_records: "Checking personal records",
  list_known_sports: "Looking up sport types",
  log_completed_training: "Logging a completed training",
  schedule_planned_training: "Scheduling a training",
  update_planned_training: "Updating a scheduled training",
  delete_planned_training: "Removing a scheduled training",
  save_memory: "Saving a note",
  load_memory: "Recalling past notes",
};

interface ResolvedToolCall {
  id: string;
  label: string;
  ok?: boolean;
}

// Our stored format bundles a tool_result for a given tool_use into the very
// next message's content array (Anthropic's shape) — so resolving a tool
// call's outcome needs the raw messages array with its original indices,
// not the post-filter list actually rendered.
function toolCallsOf(messages: ChatMessage[], index: number): ResolvedToolCall[] {
  const content = messages[index].content;
  if (typeof content === "string") return [];

  const toolUses = content.filter((b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use");
  if (toolUses.length === 0) return [];

  const next = messages[index + 1]?.content;
  const results = typeof next === "string" || !next
    ? []
    : next.filter((b): b is Extract<typeof b, { type: "tool_result" }> => b.type === "tool_result");

  return toolUses.map((tu) => {
    const result = results.find((r) => r.tool_use_id === tu.id);
    return { id: tu.id, label: TOOL_LABELS[tu.name] ?? tu.name, ok: result ? !result.is_error : undefined };
  });
}

export function CoachChat() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [activeTools, setActiveTools] = useState<{ id: string; label: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCoachMessages()
      .then(({ messages }) => setMessages(messages))
      .catch(() => setError(t("coach.historyLoadError")))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, activeTools]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    setError(null);
    setActiveTools([]);

    try {
      await sendCoachMessageStream(text, (event) => {
        if (event.type === "tool_start") {
          setActiveTools((prev) => [...prev, { id: event.id, label: event.label }]);
        } else if (event.type === "tool_end") {
          setActiveTools((prev) => prev.filter((t) => t.id !== event.id));
        } else if (event.type === "done") {
          setMessages(event.messages);
        } else if (event.type === "error") {
          setError(event.error);
        }
      });
    } catch (e: any) {
      setError(e.message ?? t("coach.genericError"));
    } finally {
      setSending(false);
      setActiveTools([]);
    }
  };

  const clearChat = async () => {
    await clearCoachMessages();
    setMessages([]);
    setConfirmClear(false);
  };

  const visibleMessages = messages
    .map((m, index) => ({ message: m, index, toolCalls: toolCallsOf(messages, index) }))
    .filter(
      ({ message, toolCalls }) =>
        textOf(message.content).trim().length > 0 ||
        thinkingOf(message.content).trim().length > 0 ||
        toolCalls.length > 0
    );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none">{t("coach.title")}</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {t("coach.subtitle")}
          </p>
        </div>

        {visibleMessages.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs text-neutral-500 hover:text-neutral-300 px-2 py-1 flex-shrink-0"
          >
            {t("coach.clearChat")}
          </button>
        )}
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("coach.clearDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("coach.clearDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={clearChat}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {loadingHistory && (
          <div className="flex justify-center py-12">
            <Spinner className="w-6 h-6" />
          </div>
        )}

        {!loadingHistory && visibleMessages.length === 0 && (
          <div className="text-center text-neutral-500 py-12">
            <div className="text-4xl mb-3">🏃‍♂️</div>
            <p>{t("coach.emptyState")}</p>
          </div>
        )}

        {visibleMessages.map(({ message: m, index, toolCalls }) => (
          <div
            key={index}
            className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "self-end bg-brand-600 text-white whitespace-pre-wrap"
                : "self-start bg-neutral-800 text-neutral-100"
            }`}
          >
            {m.role === "assistant" ? (
              <>
                {toolCalls.length > 0 && (
                  <details className="mb-2 text-xs text-neutral-500 group">
                    <summary className="cursor-pointer select-none hover:text-neutral-300 list-none flex items-center gap-1">
                      <span className="transition-transform group-open:rotate-90">›</span>
                      {t("coach.toolCalls")} ({toolCalls.length})
                    </summary>
                    <div className="mt-1.5 flex flex-col gap-1 border-l-2 border-neutral-700 pl-2">
                      {toolCalls.map((tc) => (
                        <div key={tc.id} className="flex items-center gap-1.5 text-neutral-400">
                          <span>{tc.ok === false ? "⚠️" : "✓"}</span>
                          <span>{tc.label}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {thinkingOf(m.content).trim() && (
                  <details className="mb-2 text-xs text-neutral-500 group">
                    <summary className="cursor-pointer select-none hover:text-neutral-300 list-none flex items-center gap-1">
                      <span className="transition-transform group-open:rotate-90">›</span>
                      {t("coach.thinking")}
                    </summary>
                    <div className="mt-1.5 whitespace-pre-wrap text-neutral-400 border-l-2 border-neutral-700 pl-2">
                      {thinkingOf(m.content)}
                    </div>
                  </details>
                )}
                {textOf(m.content).trim() && (
                  <div className="typeset typeset-docs max-w-[37em]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownTableWrapper}>
                      {textOf(m.content)}
                    </ReactMarkdown>
                  </div>
                )}
              </>
            ) : (
              textOf(m.content)
            )}
          </div>
        ))}

        {sending && (
          <div className="self-start bg-neutral-800 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
            {activeTools.length === 0 ? (
              <Spinner className="w-4 h-4" />
            ) : (
              activeTools.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-neutral-400">
                  <Spinner className="w-3 h-3" />
                  <span>{t.label}...</span>
                </div>
              ))
            )}
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
          placeholder={t("coach.inputPlaceholder")}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="bg-brand-500 text-white rounded-xl px-4 py-2.5 font-semibold disabled:opacity-50 active:scale-95 transition-all"
        >
          {t("coach.send")}
        </button>
      </div>
    </div>
  );
}
