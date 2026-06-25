const SESSION_LABELS: Record<string, string> = {
  easy_run: "Easy Run",
  tempo: "Tempo",
  interval: "Intervals",
  long_run: "Long Run",
  rest: "Rest",
};

const SESSION_COLORS: Record<string, string> = {
  easy_run: "bg-blue-900/60 text-blue-300",
  tempo: "bg-orange-900/60 text-orange-300",
  interval: "bg-red-900/60 text-red-300",
  long_run: "bg-purple-900/60 text-purple-300",
  rest: "bg-neutral-800 text-neutral-400",
};

const EFFORT_COLORS: Record<string, string> = {
  easy: "bg-blue-900/60 text-blue-300",
  moderate: "bg-yellow-900/60 text-yellow-300",
  hard: "bg-red-900/60 text-red-300",
};

export function SessionBadge({ type }: { type: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${SESSION_COLORS[type] ?? "bg-neutral-800 text-neutral-400"}`}>
      {SESSION_LABELS[type] ?? type}
    </span>
  );
}

export function EffortBadge({ effort }: { effort: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium capitalize ${EFFORT_COLORS[effort] ?? "bg-neutral-800 text-neutral-400"}`}>
      {effort}
    </span>
  );
}

export { SESSION_LABELS };
