import { useState } from "react";
import type { WorkoutLog } from "../../api/dashboard";
import { EffortBadge } from "../shared/Badge";
import { unlogWorkout } from "../../api/workouts";
import { Button } from "../shared/Button";
import { formatDuration } from "../../lib/dateUtils";

interface Props {
  log: WorkoutLog;
  workoutId: string;
  onUnlog: () => void;
}

export function WorkoutLogDisplay({ log, workoutId, onUnlog }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUnlog = async () => {
    setDeleting(true);
    await unlogWorkout(workoutId);
    onUnlog();
  };

  return (
    <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-xl">✅</span>
        <span className="font-semibold text-emerald-300">Workout completed</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {log.actualDistanceKm != null && (
          <div>
            <p className="text-neutral-500 text-xs">Distance</p>
            <p className="font-semibold">{log.actualDistanceKm} km</p>
          </div>
        )}
        {log.actualDurationMinutes != null && (
          <div>
            <p className="text-neutral-500 text-xs">Duration</p>
            <p className="font-semibold">{formatDuration(log.actualDurationMinutes)}</p>
          </div>
        )}
        {log.perceivedEffort && (
          <div>
            <p className="text-neutral-500 text-xs">Effort</p>
            <EffortBadge effort={log.perceivedEffort} />
          </div>
        )}
      </div>

      {log.notes && (
        <p className="text-neutral-400 text-sm italic">"{log.notes}"</p>
      )}

      {confirming ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} fullWidth>
            Keep it
          </Button>
          <Button variant="danger" size="sm" onClick={handleUnlog} disabled={deleting} fullWidth>
            {deleting ? "Removing..." : "Remove log"}
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-neutral-500 text-xs hover:text-neutral-400 text-left"
        >
          Mark as not done
        </button>
      )}
    </div>
  );
}
