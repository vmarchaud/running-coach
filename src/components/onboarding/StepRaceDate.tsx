import { Button } from "../shared/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

const PRESETS = [
  { label: "Oct 2026", value: "2026-10-18" },
  { label: "Apr 2026", value: "2026-04-19" },
  { label: "Jun 2026", value: "2026-06-21" },
];

export function StepRaceDate({ value, onChange, onNext }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 3 of 5</p>
        <h1 className="text-3xl font-bold">When's your race?</h1>
        <p className="text-neutral-400 mt-2">Pick your target race date — the plan works back from here.</p>
      </div>

      <div>
        <p className="text-neutral-500 text-sm mb-3">Quick pick</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                value === p.value
                  ? "border-brand-500 bg-brand-950/40 text-brand-300"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="race-date" className="text-neutral-500 text-sm mb-2">
          Or pick a specific date
        </Label>
        <Input
          id="race-date"
          type="date"
          value={value}
          min={today}
          onChange={(e) => onChange(e.target.value)}
          className="h-auto bg-neutral-900 border-neutral-700 rounded-xl px-4 py-3 text-white w-full focus-visible:border-brand-500 transition-colors [color-scheme:dark]"
        />
      </div>

      <Button onClick={onNext} disabled={!value} fullWidth size="lg">
        Continue
      </Button>
    </div>
  );
}
