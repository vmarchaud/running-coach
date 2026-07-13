import { Button } from "../shared/Button";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
}

export function StepDaysPerWeek({ value, onChange, onNext }: Props) {
  const { t } = useI18n();

  const OPTIONS = [
    {
      days: 3,
      label: t("onboarding.daysPerWeek3Label"),
      desc: t("onboarding.daysPerWeek3Desc"),
      suitable: t("onboarding.daysPerWeek3Suitable"),
    },
    {
      days: 4,
      label: t("onboarding.daysPerWeek4Label"),
      desc: t("onboarding.daysPerWeek4Desc"),
      suitable: t("onboarding.daysPerWeek4Suitable"),
    },
    {
      days: 5,
      label: t("onboarding.daysPerWeek5Label"),
      desc: t("onboarding.daysPerWeek5Desc"),
      suitable: t("onboarding.daysPerWeek5Suitable"),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-2">{t("onboarding.daysPerWeekStepLabel")}</p>
        <h1 className="text-3xl font-bold">{t("onboarding.daysPerWeekTitle")}</h1>
        <p className="text-neutral-400 mt-2">{t("onboarding.daysPerWeekSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => onChange(opt.days)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              value === opt.days
                ? "border-brand-500 bg-brand-950/40"
                : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">{opt.label}</div>
                <div className="text-neutral-400 text-sm">{opt.desc}</div>
                <div className="text-neutral-500 text-xs mt-1">{opt.suitable}</div>
              </div>
              {value === opt.days && <span className="text-brand-400 text-xl">✓</span>}
            </div>
          </button>
        ))}
      </div>

      <Button onClick={onNext} fullWidth size="lg">
        {t("onboarding.daysPerWeekContinue")}
      </Button>
    </div>
  );
}
