import type { Session } from "../../api/sessions";
import { SportBadge } from "../shared/Badge";
import { formatDuration } from "../../lib/dateUtils";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  session: Session;
  onSelect: () => void;
}

export function WorkoutLogRow({ session, onSelect }: Props) {
  const dateLabel = new Date(session.dateStart + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <Card
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className="cursor-pointer bg-neutral-900 hover:bg-neutral-800 rounded-2xl transition-colors"
    >
      <CardContent className="flex items-center gap-3">
        <div className="text-neutral-500 text-sm min-w-[44px] text-center">{dateLabel}</div>

        <div className="flex-1 min-w-0">
          <SportBadge sport={session.sport} />
          <div className="flex items-center gap-3 mt-1.5 text-sm text-neutral-400">
            {session.distance != null && (
              <span className="text-white font-medium">{session.distance} km</span>
            )}
            {session.duration != null && <span>{formatDuration(session.duration / 60)}</span>}
            {session.rpe != null && <span>RPE {session.rpe}/10</span>}
          </div>
        </div>

        <span className="text-neutral-600">›</span>
      </CardContent>
    </Card>
  );
}
