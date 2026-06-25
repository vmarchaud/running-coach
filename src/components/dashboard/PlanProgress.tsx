import { ProgressBar } from "../shared/ProgressBar";

interface Props {
  completed: number;
  total: number;
  currentWeek: number;
  totalWeeks: number;
}

export function PlanProgress({ completed, total, currentWeek, totalWeeks }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-neutral-900 rounded-2xl p-4">
      <p className="text-neutral-500 text-xs uppercase tracking-wide mb-3">Plan</p>
      <p className="text-2xl font-bold">W{currentWeek}<span className="text-neutral-500 text-sm font-normal">/{totalWeeks}</span></p>
      <p className="text-neutral-500 text-xs mb-2">{completed} sessions done</p>
      <ProgressBar value={completed} max={total} color="bg-purple-500" />
      <p className="text-purple-400 text-xs mt-1.5 font-medium">{pct}%</p>
    </div>
  );
}
