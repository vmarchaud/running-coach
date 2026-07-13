import { useEffect, useState } from "react";
import { getMe } from "../../api/users";
import { getWeekSessions, getObjectives, WeekSessions, Objective } from "../../api/sessions";
import { RaceCountdown } from "./RaceCountdown";
import { WeeklyProgress } from "./WeeklyProgress";
import { PlanProgress } from "./PlanProgress";
import { TodayWorkout } from "./TodayWorkout";
import { Objectives } from "./Objectives";
import { Spinner } from "../shared/Spinner";
import { diffDays, isoDate, weekMondayFromDate } from "../../lib/dateUtils";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  onWorkoutSelect: (id: number, isCompleted: boolean) => void;
  refreshKey?: number;
}

export function Dashboard({ onWorkoutSelect, refreshKey }: Props) {
  const { t } = useI18n();

  const [user, setUser] = useState<{ name: string; raceDate: string } | null>(null);
  const [objectives, setObjectives] = useState<{ main: Objective | null; secondary: Objective[] } | null>(null);
  const [week, setWeek] = useState<WeekSessions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(({ user }) => setUser(user)).catch(() => {});
    getObjectives().then(setObjectives).catch(() => setObjectives({ main: null, secondary: [] }));
  }, [refreshKey]);

  useEffect(() => {
    setLoading(true);
    const weekStart = isoDate(weekMondayFromDate(new Date()));
    getWeekSessions(weekStart)
      .then(setWeek)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

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
        <p>{t("common.somethingWrong")}</p>
      </div>
    );
  }

  // Nolio's own objective (a planned training flagged is_competition) is the
  // live, user-maintained source — prefer it over the onboarding race date,
  // falling back only if no Nolio objective is set.
  const raceDate = objectives?.main?.dateStart ?? user.raceDate;
  const daysUntilRace = Math.max(0, diffDays(new Date(), new Date(raceDate)));
  const sessions = [...week.planned, ...week.completed].sort((a, b) => a.dateStart.localeCompare(b.dateStart));

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="px-4 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="pulse-dot" />
          <span className="label-eyebrow text-neutral-500">{t("dashboard.liveFromNolio")}</span>
        </div>
        <h1 className="font-display text-4xl uppercase leading-none">
          {t("dashboard.heyGreeting")}, <span className="text-brand-400">{user.name}</span>
        </h1>
      </div>

      <div className="px-4">
        <RaceCountdown days={daysUntilRace} raceDate={raceDate} />
      </div>

      {objectives && (objectives.main || objectives.secondary.length > 0) && (
        <div className="px-4">
          <Objectives main={objectives.main} secondary={objectives.secondary} />
        </div>
      )}

      <div className="px-4 grid grid-cols-2 gap-3">
        <WeeklyProgress actual={week.weeklyActualKm} target={week.weeklyTargetKm} />
        <PlanProgress completed={week.completed.length} planned={week.planned.length} />
      </div>

      <div className="px-4">
        <h2 className="font-display text-xl uppercase tracking-wide mb-3">{t("dashboard.todaySectionTitle")}</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <TodayWorkout sessions={sessions} onSelect={onWorkoutSelect} />
        )}
      </div>
    </div>
  );
}
