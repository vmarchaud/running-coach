const SPORT_COLORS: Record<string, string> = {
  Running: "bg-blue-900/60 text-blue-300",
  Trail: "bg-purple-900/60 text-purple-300",
  Cycling: "bg-orange-900/60 text-orange-300",
  Swimming: "bg-cyan-900/60 text-cyan-300",
};

export function SportBadge({ sport }: { sport: string | null }) {
  const label = sport ?? "Session";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${SPORT_COLORS[label] ?? "bg-neutral-800 text-neutral-300"}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ isCompleted }: { isCompleted: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${
        isCompleted ? "bg-emerald-900/60 text-emerald-300" : "bg-neutral-800 text-neutral-400"
      }`}
    >
      {isCompleted ? "Done" : "Planned"}
    </span>
  );
}
