import { ProgressBar } from "../shared/ProgressBar";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  completed: number;
  planned: number;
}

export function PlanProgress({ completed, planned }: Props) {
  const total = completed + planned;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardContent>
        <p className="text-neutral-500 text-xs uppercase tracking-wide mb-3">This week</p>
        <p className="text-2xl font-bold">{completed}<span className="text-neutral-500 text-sm font-normal">/{total}</span></p>
        <p className="text-neutral-500 text-xs mb-2">sessions done</p>
        <ProgressBar value={completed} max={total} color="bg-purple-500" />
        <p className="text-purple-400 text-xs mt-1.5 font-medium">{pct}%</p>
      </CardContent>
    </Card>
  );
}
