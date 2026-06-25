import type { Workout } from "../../api/dashboard";
import { SessionBadge } from "../shared/Badge";
import { formatPace } from "../../lib/dateUtils";

interface Props {
  workout: Workout;
  dayLabel?: string;
  onClick: () => void;
}

export function WorkoutCard({ workout, dayLabel, onClick }: Props) {
  const done = !!workout.log;
  const today = new Date().toISOString().slice(0, 10);
  const isToday = workout.scheduledDate === today;
  const isPast = workout.scheduledDate < today;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
        done
          ? "bg-emerald-950/30 border-emerald-900/50"
          : isToday
          ? "bg-neutral-800 border-emerald-700/50 ring-1 ring-emerald-700/30"
          : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center min-w-[36px]">
          {dayLabel && (
            <span className={`text-xs font-semibold ${isToday ? "text-emerald-400" : "text-neutral-500"}`}>
              {dayLabel}
            </span>
          )}
          <span className={`text-lg mt-0.5 ${done ? "opacity-100" : isPast ? "opacity-30" : "opacity-70"}`}>
            {done ? "✅" : "⭕"}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SessionBadge type={workout.sessionType} />
            {isToday && !done && (
              <span className="text-xs text-emerald-400 font-medium">Today</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-sm text-neutral-400">
            {workout.targetDistanceKm != null && (
              <span>{workout.targetDistanceKm} km</span>
            )}
            {workout.targetPaceMinPerKm != null && (
              <span>{formatPace(workout.targetPaceMinPerKm)} /km</span>
            )}
          </div>

          {done && workout.log && (
            <div className="flex items-center gap-3 mt-1 text-xs text-emerald-400">
              {workout.log.actualDistanceKm != null && (
                <span>✓ {workout.log.actualDistanceKm} km</span>
              )}
              {workout.log.actualDurationMinutes != null && (
                <span>{Math.round(workout.log.actualDurationMinutes)}min</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
