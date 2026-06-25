import { ProgressBar } from "../shared/ProgressBar";

interface Props {
  actual: number;
  target: number;
}

export function WeeklyProgress({ actual, target }: Props) {
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;

  return (
    <div className="bg-neutral-900 rounded-2xl p-4">
      <p className="text-neutral-500 text-xs uppercase tracking-wide mb-3">This week</p>
      <p className="text-2xl font-bold">{actual}<span className="text-neutral-500 text-sm font-normal"> km</span></p>
      <p className="text-neutral-500 text-xs mb-2">of {target} km target</p>
      <ProgressBar value={actual} max={target} />
      <p className="text-emerald-400 text-xs mt-1.5 font-medium">{pct}%</p>
    </div>
  );
}
