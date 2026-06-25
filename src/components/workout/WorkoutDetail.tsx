import { useEffect, useState } from "react";
import { getWorkout } from "../../api/workouts";
import type { Workout } from "../../api/dashboard";
import { SessionBadge, EffortBadge } from "../shared/Badge";
import { LogForm } from "./LogForm";
import { WorkoutLogDisplay } from "./WorkoutLogDisplay";
import { Spinner } from "../shared/Spinner";
import { Button } from "../shared/Button";
import { formatPace } from "../../lib/dateUtils";

interface Props {
  workoutId: string;
  onBack: () => void;
  onLogged: () => void;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WorkoutDetail({ workoutId, onBack, onLogged }: Props) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);

  const load = () => {
    setLoading(true);
    getWorkout(workoutId)
      .then(setWorkout)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [workoutId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!workout) return null;

  const dateLabel = new Date(workout.scheduledDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="flex flex-col pb-8">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-neutral-800">
        <button onClick={onBack} className="text-neutral-400 hover:text-white p-1">
          ← Back
        </button>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">
        <div>
          <p className="text-neutral-500 text-sm">{dateLabel}</p>
          <div className="flex items-center gap-2 mt-2">
            <SessionBadge type={workout.sessionType} />
            {workout.log && <EffortBadge effort={workout.log.perceivedEffort ?? "moderate"} />}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-2xl p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Target distance</p>
            <p className="text-2xl font-bold">
              {workout.targetDistanceKm != null ? `${workout.targetDistanceKm} km` : "—"}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Target pace</p>
            <p className="text-2xl font-bold">
              {workout.targetPaceMinPerKm != null
                ? `${formatPace(workout.targetPaceMinPerKm)}`
                : "—"}
            </p>
            {workout.targetPaceMinPerKm && (
              <p className="text-neutral-500 text-xs">min/km</p>
            )}
          </div>
        </div>

        {workout.notes && (
          <div className="bg-neutral-900 rounded-2xl p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">Coach notes</p>
            <p className="text-neutral-300 text-sm leading-relaxed">{workout.notes}</p>
          </div>
        )}

        {workout.log ? (
          <WorkoutLogDisplay
            log={workout.log}
            onUnlog={() => {
              load();
              onLogged();
            }}
            workoutId={workoutId}
          />
        ) : showLogForm ? (
          <LogForm
            workoutId={workoutId}
            targetDistanceKm={workout.targetDistanceKm}
            onSuccess={() => {
              setShowLogForm(false);
              load();
              onLogged();
            }}
            onCancel={() => setShowLogForm(false)}
          />
        ) : (
          <Button onClick={() => setShowLogForm(true)} fullWidth size="lg">
            Log this workout
          </Button>
        )}
      </div>
    </div>
  );
}
