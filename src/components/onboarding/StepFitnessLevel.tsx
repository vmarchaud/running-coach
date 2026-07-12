import { Button } from "../shared/Button";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

const LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    emoji: "🌱",
    desc: "I've never run 10 km or I'm getting back to it",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    emoji: "🏃",
    desc: "I can run 10 km and train regularly",
  },
  {
    id: "advanced",
    label: "Advanced",
    emoji: "⚡",
    desc: "I've finished a half-marathon before",
  },
  {
    id: "expert",
    label: "Expert",
    emoji: "🔥",
    desc: "Targeting sub-1h30 — I train seriously",
  },
];

export function StepFitnessLevel({ value, onChange, onNext }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 2 of 5</p>
        <h1 className="text-3xl font-bold">What's your fitness level?</h1>
        <p className="text-neutral-400 mt-2">Be honest — your plan will be built around this.</p>
      </div>

      <div className="flex flex-col gap-3">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => onChange(level.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              value === level.id
                ? "border-brand-500 bg-brand-950/40"
                : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{level.emoji}</span>
              <div>
                <div className="font-semibold">{level.label}</div>
                <div className="text-neutral-400 text-sm">{level.desc}</div>
              </div>
              {value === level.id && (
                <span className="ml-auto text-brand-400">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <Button onClick={onNext} disabled={!value} fullWidth size="lg">
        Continue
      </Button>
    </div>
  );
}
