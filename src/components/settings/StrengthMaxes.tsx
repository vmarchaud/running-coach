import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStrengthMaxes, putStrengthMax } from "../../api/users";
import { useI18n } from "../../lib/i18n/context";

// A fixed starter set of common lifts — the athlete isn't limited to these
// (any exercise name is valid via the API), but a short, familiar list is
// easier to fill in than an open-ended "add exercise" flow for the common case.
const COMMON_EXERCISES = ["Back Squat", "Deadlift", "Bench Press", "Overhead Press"];

export function StrengthMaxes() {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStrengthMaxes()
      .then(({ maxes }) => {
        const byExercise: Record<string, string> = {};
        for (const m of maxes) byExercise[m.exercise] = String(m.valueKg);
        setValues(byExercise);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = (exercise: string, raw: string) => {
    const valueKg = parseInt(raw, 10);
    putStrengthMax(exercise, Number.isFinite(valueKg) ? valueKg : 0).catch(() => {});
  };

  if (loading) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold">{t("settings.strengthMaxesTitle")}</p>
          <p className="text-neutral-500 text-xs mt-0.5">{t("settings.strengthMaxesSubtitle")}</p>
        </div>

        {COMMON_EXERCISES.map((exercise) => (
          <div key={exercise} className="flex items-center justify-between gap-3">
            <Label htmlFor={`max-${exercise}`} className="text-neutral-300 text-sm font-normal">
              {exercise}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`max-${exercise}`}
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="—"
                className="w-20 text-right"
                value={values[exercise] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [exercise]: e.target.value }))}
                onBlur={(e) => save(exercise, e.target.value)}
              />
              <span className="text-neutral-500 text-sm">kg</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
