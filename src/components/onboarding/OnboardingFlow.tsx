import { useState } from "react";
import { StepName } from "./StepName";
import { StepFitnessLevel } from "./StepFitnessLevel";
import { StepRaceDate } from "./StepRaceDate";
import { StepDaysPerWeek } from "./StepDaysPerWeek";
import { StepTargetTime } from "./StepTargetTime";
import { StepGenerating } from "./StepGenerating";
import { createUser } from "../../api/users";

interface Props {
  userId: string;
  onComplete: () => void;
}

export interface OnboardingState {
  name: string;
  fitnessLevel: string;
  raceDate: string;
  daysPerWeek: number;
  targetTimeMinutes: number | null;
}

const STEPS = ["name", "fitness", "raceDate", "days", "targetTime", "generating"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingFlow({ userId, onComplete }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [data, setData] = useState<OnboardingState>({
    name: "",
    fitnessLevel: "",
    raceDate: "2026-10-18",
    daysPerWeek: 4,
    targetTimeMinutes: null,
  });

  const next = () => {
    const idx = STEPS.indexOf(step);
    setStep(STEPS[idx + 1]);
  };

  const update = (partial: Partial<OnboardingState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const submit = async () => {
    setStep("generating");
    await createUser({
      id: userId,
      name: data.name,
      fitnessLevel: data.fitnessLevel,
      daysPerWeek: data.daysPerWeek as any,
      raceDate: data.raceDate,
      targetTimeMinutes: data.targetTimeMinutes,
    });
    onComplete();
  };

  const progress = (STEPS.indexOf(step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {step !== "generating" && (
        <div className="h-1 bg-neutral-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 pt-12 pb-8 max-w-lg mx-auto w-full">
        {step === "name" && (
          <StepName
            value={data.name}
            onChange={(name) => update({ name })}
            onNext={next}
          />
        )}
        {step === "fitness" && (
          <StepFitnessLevel
            value={data.fitnessLevel}
            onChange={(fitnessLevel) => update({ fitnessLevel })}
            onNext={next}
          />
        )}
        {step === "raceDate" && (
          <StepRaceDate
            value={data.raceDate}
            onChange={(raceDate) => update({ raceDate })}
            onNext={next}
          />
        )}
        {step === "days" && (
          <StepDaysPerWeek
            value={data.daysPerWeek}
            onChange={(daysPerWeek) => update({ daysPerWeek })}
            onNext={next}
          />
        )}
        {step === "targetTime" && (
          <StepTargetTime
            fitnessLevel={data.fitnessLevel}
            value={data.targetTimeMinutes}
            onChange={(targetTimeMinutes) => update({ targetTimeMinutes })}
            onNext={submit}
          />
        )}
        {step === "generating" && <StepGenerating name={data.name} />}
      </div>
    </div>
  );
}
