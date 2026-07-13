import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  days: number;
  raceDate: string;
}

export function RaceCountdown({ days, raceDate }: Props) {
  const { t } = useI18n();
  const formatted = new Date(raceDate + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="bg-gradient-to-br from-brand-950 to-neutral-900 border-brand-900/50 [--card-spacing:--spacing(5)]">
      <CardContent>
        <p className="label-eyebrow text-brand-400 mb-1">{t("dashboard.raceDay")}</p>
        <div className="flex items-end gap-2">
          <span className="font-display text-6xl leading-none tabular-nums">{days}</span>
          <span className="text-neutral-400 mb-1.5">{t("dashboard.daysToGo")}</span>
        </div>
        <p className="text-neutral-500 text-sm mt-1">{formatted}</p>
      </CardContent>
    </Card>
  );
}
