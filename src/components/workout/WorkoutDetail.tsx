import { useEffect, useState } from "react";
import { getSessionDetail, Session } from "../../api/sessions";
import { SportBadge, StatusBadge } from "../shared/Badge";
import { LogForm } from "./LogForm";
import { WorkoutLogDisplay } from "./WorkoutLogDisplay";
import { RunStreams } from "./RunStreams";
import { Spinner } from "../shared/Spinner";
import { Button } from "../shared/Button";

interface Props {
  sessionId: number;
  isCompleted: boolean;
  onBack: () => void;
  onLogged: () => void;
}

export function WorkoutDetail({ sessionId, isCompleted, onBack, onLogged }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSessionDetail(sessionId, isCompleted)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [sessionId, isCompleted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) return null;

  const dateLabel = new Date(session.dateStart + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
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
          <h1 className="text-xl font-bold mt-1">{session.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <SportBadge sport={session.sport} />
            <StatusBadge isCompleted={session.isCompleted} />
          </div>
        </div>

        <div className="bg-neutral-900 rounded-2xl p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Distance</p>
            <p className="text-2xl font-bold">{session.distance != null ? `${session.distance} km` : "—"}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Duration</p>
            <p className="text-2xl font-bold">
              {session.duration != null ? `${Math.round(session.duration / 60)} min` : "—"}
            </p>
          </div>
          {session.elevationGain != null && (
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Elevation</p>
              <p className="text-lg font-semibold">{session.elevationGain} m</p>
            </div>
          )}
          {session.rpe != null && (
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">RPE</p>
              <p className="text-lg font-semibold">{session.rpe}/10</p>
            </div>
          )}
        </div>

        {session.description && (
          <div className="bg-neutral-900 rounded-2xl p-4">
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">Notes</p>
            <p className="text-neutral-300 text-sm leading-relaxed">{session.description}</p>
          </div>
        )}

        {session.streams && session.streams.length > 1 && <RunStreams streams={session.streams} />}

        {session.isCompleted ? (
          <WorkoutLogDisplay session={session} />
        ) : showLogForm ? (
          <LogForm
            session={session}
            onSuccess={() => {
              setShowLogForm(false);
              onLogged();
            }}
            onCancel={() => setShowLogForm(false)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-neutral-500 text-xs text-center">
              Sessions synced from Coros/Whoop mark this done automatically. Log it manually only if it won't sync.
            </p>
            <Button onClick={() => setShowLogForm(true)} fullWidth size="lg">
              Log this workout manually
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
