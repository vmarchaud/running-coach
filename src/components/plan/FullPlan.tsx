import { useEffect, useState } from "react";
import { getFullPlan, FullPlanData } from "../../api/workouts";
import { WeekSection } from "./WeekSection";
import { Spinner } from "../shared/Spinner";

interface Props {
  onWorkoutSelect: (id: string) => void;
  refreshKey?: number;
}

export function FullPlan({ onWorkoutSelect, refreshKey }: Props) {
  const [data, setData] = useState<FullPlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFullPlan()
      .then(setData)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!data) return null;

  const today = new Date().toISOString().slice(0, 10);

  const currentWeekNum = (() => {
    for (let w = 1; w <= data.totalWeeks; w++) {
      const workouts = data.byWeek[w] ?? [];
      const dates = workouts.map((x) => x.scheduledDate);
      if (dates.some((d) => d >= today) || w === data.totalWeeks) return w;
    }
    return 1;
  })();

  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Training Plan</h1>
        <p className="text-neutral-400 text-sm mt-0.5">{data.totalWeeks} weeks total</p>
      </div>

      {Array.from({ length: data.totalWeeks }, (_, i) => i + 1).map((weekNum) => (
        <WeekSection
          key={weekNum}
          weekNum={weekNum}
          workouts={data.byWeek[weekNum] ?? []}
          isCurrentWeek={weekNum === currentWeekNum}
          defaultOpen={weekNum === currentWeekNum}
          onWorkoutSelect={onWorkoutSelect}
        />
      ))}
    </div>
  );
}
