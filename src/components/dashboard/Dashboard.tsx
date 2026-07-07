import { useEffect, useState } from "react";
import { getMe } from "../../api/users";
import { getWeekSessions, WeekSessions } from "../../api/sessions";
import { RaceCountdown } from "./RaceCountdown";
import { WeeklyProgress } from "./WeeklyProgress";
import { PlanProgress } from "./PlanProgress";
import { ThisWeekWorkouts } from "./ThisWeekWorkouts";
import { NolioConnect } from "./NolioConnect";
import { Spinner } from "../shared/Spinner";
import { addDays, diffDays, isoDate, weekMondayFromDate } from "../../lib/dateUtils";

interface Props {
  onWorkoutSelect: (id: number, isCompleted: boolean) => void;
  refreshKey?: number;
}

function weekLabel(offset: number): string {
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  return `${Math.abs(offset)} weeks ago`;
}

export function Dashboard({ onWorkoutSelect, refreshKey }: Props) {
  const [user, setUser] = useState<{ name: string; raceDate: string } | null>(null);
  const [week, setWeek] = useState<WeekSessions | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(({ user }) => setUser(user)).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    setLoading(true);
    const weekStart = isoDate(addDays(weekMondayFromDate(new Date()), weekOffset * 7));
    getWeekSessions(weekStart)
      .then(setWeek)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey, weekOffset]);

  if (!user || (loading && !week)) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !week) {
    return (
      <div className="text-center py-20 text-neutral-400">
        <p>Something went wrong. Pull to refresh.</p>
      </div>
    );
  }

  const daysUntilRace = Math.max(0, diffDays(new Date(), new Date(user.raceDate)));
  const sessions = [...week.planned, ...week.completed].sort((a, b) => a.dateStart.localeCompare(b.dateStart));

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Hey, {user.name} 👋</h1>
        <p className="text-neutral-400 text-sm mt-0.5">Synced live from Nolio</p>
      </div>

      <div className="px-4">
        <RaceCountdown days={daysUntilRace} raceDate={user.raceDate} />
      </div>

      <div className="px-4">
        <NolioConnect />
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="text-neutral-500 hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Previous week"
            >
              ‹
            </button>
            <h2 className="text-lg font-semibold">{weekLabel(weekOffset)}</h2>
            <button
              onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
              disabled={weekOffset === 0}
              className="text-neutral-500 hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next week"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <WeeklyProgress actual={week.weeklyActualKm} target={week.weeklyTargetKm} />
          <PlanProgress completed={week.completed.length} planned={week.planned.length} />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <ThisWeekWorkouts sessions={sessions} onSelect={onWorkoutSelect} />
        )}
      </div>
    </div>
  );
}
