import type { Session } from "../../api/sessions";
import { WorkoutCard } from "../workout/WorkoutCard";
import { Card, CardContent } from "@/components/ui/card";
import { isoDate } from "../../lib/dateUtils";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  sessions: Session[];
  onSelect: (id: number, isCompleted: boolean) => void;
}

// The home screen used to list the whole week (7 days, often needing a
// scroll just to see today) — showing only today's session(s) keeps it to
// one screen. Browsing other days/weeks still lives in the Plan tab.
export function TodayWorkout({ sessions, onSelect }: Props) {
  const { t } = useI18n();
  const today = isoDate(new Date());
  const todaysSessions = sessions.filter((s) => s.dateStart === today);

  if (todaysSessions.length === 0) {
    return (
      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="text-center text-neutral-500">{t("dashboard.noSessionsToday")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {todaysSessions.map((s) => (
        <WorkoutCard
          key={`${s.isCompleted ? "c" : "p"}-${s.id}`}
          session={s}
          onClick={() => onSelect(s.id, s.isCompleted)}
        />
      ))}
    </div>
  );
}
