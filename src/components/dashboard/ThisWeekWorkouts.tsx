import type { Session } from "../../api/sessions";
import { WorkoutCard } from "../workout/WorkoutCard";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  sessions: Session[];
  onSelect: (id: number, isCompleted: boolean) => void;
}

const DAY_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"];

export function ThisWeekWorkouts({ sessions, onSelect }: Props) {
  const { t } = useI18n();

  if (sessions.length === 0) {
    return (
      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="text-center text-neutral-500">
          {t("dashboard.noSessionsThisWeek")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((s) => (
        <WorkoutCard
          key={`${s.isCompleted ? "c" : "p"}-${s.id}`}
          session={s}
          dayLabel={t(`dashboard.${DAY_KEYS[new Date(s.dateStart + "T00:00:00").getDay()]}`)}
          onClick={() => onSelect(s.id, s.isCompleted)}
        />
      ))}
    </div>
  );
}
