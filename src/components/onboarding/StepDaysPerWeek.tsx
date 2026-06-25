import { Button } from "../shared/Button";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
}

const OPTIONS = [
  {
    days: 3,
    label: "3 days",
    desc: "Easy schedule — Mon, Wed, Sat",
    suitable: "Good for beginners or busy weeks",
  },
  {
    days: 4,
    label: "4 days",
    desc: "Balanced — Mon, Wed, Thu, Sat",
    suitable: "Most popular choice",
  },
  {
    days: 5,
    label: "5 days",
    desc: "Intensive — Mon–Fri, Sat",
    suitable: "For serious runners with time",
  },
];

export function StepDaysPerWeek({ value, onChange, onNext }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 4 of 5</p>
        <h1 className="text-3xl font-bold">How many days per week?</h1>
        <p className="text-neutral-400 mt-2">Be realistic — consistency beats intensity.</p>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => onChange(opt.days)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              value === opt.days
                ? "border-emerald-500 bg-emerald-950/40"
                : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">{opt.label}</div>
                <div className="text-neutral-400 text-sm">{opt.desc}</div>
                <div className="text-neutral-500 text-xs mt-1">{opt.suitable}</div>
              </div>
              {value === opt.days && <span className="text-emerald-400 text-xl">✓</span>}
            </div>
          </button>
        ))}
      </div>

      <Button onClick={onNext} fullWidth size="lg">
        Continue
      </Button>
    </div>
  );
}
