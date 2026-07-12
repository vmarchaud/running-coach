import { useState } from "react";
import { logSession } from "../../api/sessions";
import type { Session } from "../../api/sessions";
import { Button } from "../shared/Button";

interface Props {
  session: Session;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LogForm({ session, onSuccess, onCancel }: Props) {
  const [distance, setDistance] = useState(session.distance?.toString() ?? "");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [rpe, setRpe] = useState(session.rpe?.toString() ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const totalSeconds = ((parseInt(durationH || "0") * 60) + parseInt(durationM || "0")) * 60;

    await logSession({
      name: session.name,
      sportId: session.sportId ?? 2,
      dateStart: session.dateStart,
      distance: distance ? parseFloat(distance) : undefined,
      duration: totalSeconds > 0 ? totalSeconds : undefined,
      rpe: rpe ? parseInt(rpe) : undefined,
      description: notes || undefined,
    });
    onSuccess();
  };

  return (
    <div className="bg-neutral-900 rounded-2xl p-5 flex flex-col gap-5">
      <h3 className="font-semibold text-lg">Log workout</h3>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">Distance (km)</label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder={session.distance?.toString() ?? "0.0"}
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">Duration</label>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            min="0"
            max="5"
            value={durationH}
            onChange={(e) => setDurationH(e.target.value)}
            placeholder="0"
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white flex-1 text-center focus:outline-none focus:border-brand-500"
          />
          <span className="text-neutral-500">h</span>
          <input
            type="number"
            min="0"
            max="59"
            value={durationM}
            onChange={(e) => setDurationM(e.target.value)}
            placeholder="00"
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white flex-1 text-center focus:outline-none focus:border-brand-500"
          />
          <span className="text-neutral-500">min</span>
        </div>
      </div>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">RPE (1-10)</label>
        <input
          type="number"
          min="1"
          max="10"
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it go?"
          rows={2}
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white w-full resize-none focus:outline-none focus:border-brand-500"
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
