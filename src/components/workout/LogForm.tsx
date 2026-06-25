import { useState } from "react";
import { logWorkout } from "../../api/workouts";
import { Button } from "../shared/Button";

interface Props {
  workoutId: string;
  targetDistanceKm: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const EFFORTS = ["easy", "moderate", "hard"] as const;

export function LogForm({ workoutId, targetDistanceKm, onSuccess, onCancel }: Props) {
  const [distance, setDistance] = useState(targetDistanceKm?.toString() ?? "");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [effort, setEffort] = useState<string>("moderate");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const totalMins =
      (parseInt(durationH || "0") * 60) + parseInt(durationM || "0");
    await logWorkout(workoutId, {
      actualDistanceKm: distance ? parseFloat(distance) : undefined,
      actualDurationMinutes: totalMins > 0 ? totalMins : undefined,
      perceivedEffort: effort,
      notes: notes || undefined,
    });
    onSuccess();
  };

  return (
    <div className="bg-neutral-900 rounded-2xl p-5 flex flex-col gap-5">
      <h3 className="font-semibold text-lg">Log workout</h3>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">
          Distance (km)
        </label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder={targetDistanceKm?.toString() ?? "0.0"}
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">
          Duration
        </label>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            min="0"
            max="5"
            value={durationH}
            onChange={(e) => setDurationH(e.target.value)}
            placeholder="0"
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white flex-1 text-center focus:outline-none focus:border-emerald-500"
          />
          <span className="text-neutral-500">h</span>
          <input
            type="number"
            min="0"
            max="59"
            value={durationM}
            onChange={(e) => setDurationM(e.target.value)}
            placeholder="00"
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white flex-1 text-center focus:outline-none focus:border-emerald-500"
          />
          <span className="text-neutral-500">min</span>
        </div>
      </div>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">
          How did it feel?
        </label>
        <div className="flex gap-2">
          {EFFORTS.map((e) => (
            <button
              key={e}
              onClick={() => setEffort(e)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-all ${
                effort === e
                  ? e === "easy"
                    ? "border-blue-500 bg-blue-950/40 text-blue-300"
                    : e === "moderate"
                    ? "border-yellow-500 bg-yellow-950/40 text-yellow-300"
                    : "border-red-500 bg-red-950/40 text-red-300"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it go?"
          rows={2}
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white w-full resize-none focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} fullWidth>Cancel</Button>
        <Button onClick={submit} disabled={saving} fullWidth>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
