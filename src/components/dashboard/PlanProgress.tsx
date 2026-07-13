import { ProgressBar } from "../shared/ProgressBar";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  completed: number;
  planned: number;
}

export function PlanProgress({ completed, planned }: Props) {
  const { t } = useI18n();
  const total = completed + planned;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardContent>
        <p className="text-neutral-500 text-xs uppercase tracking-wide mb-3">{t("dashboard.thisWeek")}</p>
        <p className="text-2xl font-bold">{completed}<span className="text-neutral-500 text-sm font-normal">/{total}</span></p>
        <p className="text-neutral-500 text-xs mb-2">{t("dashboard.sessionsDone")}</p>
        <ProgressBar value={completed} max={total} color="bg-purple-500" />
        <p className="text-purple-400 text-xs mt-1.5 font-medium">{pct}%</p>
      </CardContent>
    </Card>
  );
}
