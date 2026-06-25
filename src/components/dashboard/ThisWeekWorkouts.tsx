import type { Workout } from "../../api/dashboard";
import { WorkoutCard } from "../workout/WorkoutCard";

interface Props {
  workouts: Workout[];
  onSelect: (id: string) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ThisWeekWorkouts({ workouts, onSelect }: Props) {
  if (workouts.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 text-center text-neutral-500">
        No workouts scheduled this week.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {workouts.map((w) => (
        <WorkoutCard
          key={w.id}
          workout={w}
          dayLabel={DAY_NAMES[w.dayOfWeek]}
          onClick={() => onSelect(w.id)}
        />
      ))}
    </div>
  );
}
