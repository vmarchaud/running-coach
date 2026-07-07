import type { Session } from "../../api/sessions";
import { WorkoutCard } from "../workout/WorkoutCard";

interface Props {
  sessions: Session[];
  onSelect: (id: number, isCompleted: boolean) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ThisWeekWorkouts({ sessions, onSelect }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 text-center text-neutral-500">
        No sessions scheduled this week.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((s) => (
        <WorkoutCard
          key={`${s.isCompleted ? "c" : "p"}-${s.id}`}
          session={s}
          dayLabel={DAY_NAMES[new Date(s.dateStart + "T00:00:00").getDay()]}
          onClick={() => onSelect(s.id, s.isCompleted)}
        />
      ))}
    </div>
  );
}
