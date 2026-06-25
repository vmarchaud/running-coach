import type { HistoryItem } from "../../api/history";
import { SessionBadge, EffortBadge } from "../shared/Badge";
import { formatDuration } from "../../lib/dateUtils";

interface Props {
  item: HistoryItem;
  onSelect: () => void;
}

export function WorkoutLogRow({ item, onSelect }: Props) {
  const dateLabel = new Date(item.completedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-neutral-900 hover:bg-neutral-800 rounded-2xl p-4 flex items-center gap-3 transition-colors"
    >
      <div className="text-neutral-500 text-sm min-w-[44px] text-center">
        {dateLabel}
      </div>

      <div className="flex-1 min-w-0">
        {item.workout && <SessionBadge type={item.workout.sessionType} />}
        <div className="flex items-center gap-3 mt-1.5 text-sm text-neutral-400">
          {item.actualDistanceKm != null && (
            <span className="text-white font-medium">{item.actualDistanceKm} km</span>
          )}
          {item.actualDurationMinutes != null && (
            <span>{formatDuration(item.actualDurationMinutes)}</span>
          )}
          {item.perceivedEffort && <EffortBadge effort={item.perceivedEffort} />}
        </div>
      </div>

      <span className="text-neutral-600">›</span>
    </button>
  );
}
