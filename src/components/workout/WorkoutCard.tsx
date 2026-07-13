import type { Session } from "../../api/sessions";
import { SportBadge } from "../shared/Badge";
import { formatDuration } from "../../lib/dateUtils";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  session: Session;
  dayLabel?: string;
  onClick: () => void;
}

export function WorkoutCard({ session, dayLabel, onClick }: Props) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const isToday = session.dateStart === today;
  const isPast = session.dateStart < today;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
        session.isCompleted
          ? "bg-brand-950/30 border-brand-900/50"
          : isToday
          ? "bg-neutral-800 border-brand-700/50 ring-1 ring-brand-700/30"
          : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center min-w-[36px]">
          {dayLabel && (
            <span className={`text-xs font-semibold ${isToday ? "text-brand-400" : "text-neutral-500"}`}>
              {dayLabel}
            </span>
          )}
          <span className={`text-lg mt-0.5 ${session.isCompleted ? "opacity-100" : isPast ? "opacity-30" : "opacity-70"}`}>
            {session.isCompleted ? "✅" : "⭕"}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SportBadge sport={session.sport} />
            <span className="text-sm text-neutral-300 truncate">{session.name}</span>
            {isToday && !session.isCompleted && (
              <span className="text-xs text-brand-400 font-medium">{t("workout.todayBadge")}</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-sm text-neutral-400">
            {session.distance != null && <span>{session.distance} km</span>}
            {session.duration != null && <span>{formatDuration(session.duration / 60)}</span>}
            {session.rpe != null && <span>{t("workout.rpeShort")} {session.rpe}/10</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
