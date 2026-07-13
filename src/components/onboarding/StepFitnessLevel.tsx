import { Button } from "../shared/Button";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function StepFitnessLevel({ value, onChange, onNext }: Props) {
  const { t } = useI18n();

  const LEVELS = [
    {
      id: "beginner",
      label: t("onboarding.fitnessBeginnerLabel"),
      emoji: "🌱",
      desc: t("onboarding.fitnessBeginnerDesc"),
    },
    {
      id: "intermediate",
      label: t("onboarding.fitnessIntermediateLabel"),
      emoji: "🏃",
      desc: t("onboarding.fitnessIntermediateDesc"),
    },
    {
      id: "advanced",
      label: t("onboarding.fitnessAdvancedLabel"),
      emoji: "⚡",
      desc: t("onboarding.fitnessAdvancedDesc"),
    },
    {
      id: "expert",
      label: t("onboarding.fitnessExpertLabel"),
      emoji: "🔥",
      desc: t("onboarding.fitnessExpertDesc"),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-2">{t("onboarding.fitnessStepLabel")}</p>
        <h1 className="text-3xl font-bold">{t("onboarding.fitnessTitle")}</h1>
        <p className="text-neutral-400 mt-2">{t("onboarding.fitnessSubtitle")}</p>
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
        {t("onboarding.fitnessContinue")}
      </Button>
    </div>
  );
}
