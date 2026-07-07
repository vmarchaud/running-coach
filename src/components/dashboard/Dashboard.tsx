import { useEffect, useState } from "react";
import { getDashboard, DashboardData } from "../../api/dashboard";
import { RaceCountdown } from "./RaceCountdown";
import { WeeklyProgress } from "./WeeklyProgress";
import { PlanProgress } from "./PlanProgress";
import { ThisWeekWorkouts } from "./ThisWeekWorkouts";
import { NolioConnect } from "./NolioConnect";
import { Spinner } from "../shared/Spinner";

interface Props {
  onWorkoutSelect: (id: number, isCompleted: boolean) => void;
  refreshKey?: number;
}

export function Dashboard({ onWorkoutSelect, refreshKey }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-neutral-400">
        <p>Something went wrong. Pull to refresh.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Hey, {data.user.name} 👋</h1>
        <p className="text-neutral-400 text-sm mt-0.5">Synced live from Nolio</p>
      </div>

      <div className="px-4">
        <RaceCountdown days={data.daysUntilRace} raceDate={data.user.raceDate} />
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        <WeeklyProgress actual={data.weeklyActualKm} target={data.weeklyTargetKm} />
        <PlanProgress completed={data.completedCount} planned={data.plannedCount} />
      </div>

      <div className="px-4">
        <NolioConnect />
      </div>

      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3">This week</h2>
        <ThisWeekWorkouts sessions={data.sessions} onSelect={onWorkoutSelect} />
      </div>
    </div>
  );
}
