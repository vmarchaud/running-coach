import { useState } from "react";
import { Button } from "../shared/Button";

interface Props {
  fitnessLevel: string;
  value: number | null;
  onChange: (v: number | null) => void;
  onNext: () => void;
}

const SUGGESTIONS: Record<string, { label: string; minutes: number }[]> = {
  beginner: [
    { label: "Just finish", minutes: 0 },
    { label: "Under 2h30", minutes: 150 },
    { label: "Under 2h15", minutes: 135 },
  ],
  intermediate: [
    { label: "Just finish", minutes: 0 },
    { label: "Under 2h", minutes: 120 },
    { label: "Under 1h50", minutes: 110 },
  ],
  advanced: [
    { label: "Under 1h45", minutes: 105 },
    { label: "Under 1h40", minutes: 100 },
    { label: "Under 1h35", minutes: 95 },
  ],
  expert: [
    { label: "Under 1h35", minutes: 95 },
    { label: "Under 1h30", minutes: 90 },
    { label: "Sub 1h25", minutes: 85 },
  ],
};

export function StepTargetTime({ fitnessLevel, value, onChange, onNext }: Props) {
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");
  const suggestions = SUGGESTIONS[fitnessLevel] ?? SUGGESTIONS.intermediate;

  const setFromSuggestion = (minutes: number) => {
    if (minutes === 0) {
      onChange(null);
      setHours("");
      setMins("");
    } else {
      onChange(minutes);
      setHours(String(Math.floor(minutes / 60)));
      setMins(String(minutes % 60));
    }
  };

  const handleTimeInput = (h: string, m: string) => {
    setHours(h);
    setMins(m);
    const total = parseInt(h || "0") * 60 + parseInt(m || "0");
    onChange(total > 0 ? total : null);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 5 of 5</p>
        <h1 className="text-3xl font-bold">Do you have a time goal?</h1>
        <p className="text-neutral-400 mt-2">Optional — skip this if you just want to finish.</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-neutral-500 text-sm">Common targets</p>
        <div className="flex gap-2 flex-wrap">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => setFromSuggestion(s.minutes)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                (s.minutes === 0 && value === null) || (s.minutes > 0 && value === s.minutes)
                  ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-neutral-500 text-sm mb-2">Or enter a custom time</p>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <input
              type="number"
              placeholder="1"
              min="0"
              max="4"
              value={hours}
              onChange={(e) => handleTimeInput(e.target.value, mins)}
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white w-full text-center text-xl focus:outline-none focus:border-emerald-500"
            />
            <p className="text-neutral-500 text-xs text-center mt-1">hours</p>
          </div>
          <span className="text-2xl text-neutral-500 pb-5">:</span>
          <div className="flex-1">
            <input
              type="number"
              placeholder="45"
              min="0"
              max="59"
              value={mins}
              onChange={(e) => handleTimeInput(hours, e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white w-full text-center text-xl focus:outline-none focus:border-emerald-500"
            />
            <p className="text-neutral-500 text-xs text-center mt-1">minutes</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onNext} fullWidth size="lg">
          {value ? "Build my plan" : "Build my plan (no time goal)"}
        </Button>
      </div>
    </div>
  );
}
