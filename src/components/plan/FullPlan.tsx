import { useEffect, useState } from "react";
import { getPlanSessions, Session } from "../../api/sessions";
import { WeekSection } from "./WeekSection";
import { Spinner } from "../shared/Spinner";
import { isoDate, weekMondayFromDate } from "../../lib/dateUtils";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  onWorkoutSelect: (id: number, isCompleted: boolean) => void;
  refreshKey?: number;
}

export function FullPlan({ onWorkoutSelect, refreshKey }: Props) {
  const { t } = useI18n();
  const [byWeek, setByWeek] = useState<Record<string, Session[]> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlanSessions()
      .then((d) => setByWeek(d.byWeek))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!byWeek) return null;

  const currentWeekStart = isoDate(weekMondayFromDate(new Date()));
  const weekStarts = Object.keys(byWeek).sort();

  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">{t("plan.title")}</h1>
        <p className="text-neutral-400 text-sm mt-0.5">{t("plan.subtitle")}</p>
      </div>

      {weekStarts.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 px-4">
          <div className="text-4xl mb-3">📋</div>
          <p>{t("plan.emptyTitle")}</p>
          <p className="text-sm mt-1">{t("plan.emptySubtitle")}</p>
        </div>
      ) : (
        weekStarts.map((weekStart) => (
          <WeekSection
            key={weekStart}
            weekStart={weekStart}
            sessions={byWeek[weekStart]}
            isCurrentWeek={weekStart === currentWeekStart}
            defaultOpen={weekStart === currentWeekStart}
            onWorkoutSelect={onWorkoutSelect}
          />
        ))
      )}
    </div>
  );
}
