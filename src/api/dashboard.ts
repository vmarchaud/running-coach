import { api } from "./client";

export interface WorkoutLog {
  id: string;
  workoutId: string;
  completedAt: string;
  actualDistanceKm: number | null;
  actualDurationMinutes: number | null;
  perceivedEffort: string | null;
  notes: string | null;
}

export interface Workout {
  id: string;
  planId: string;
  userId: string;
  weekNumber: number;
  dayOfWeek: number;
  scheduledDate: string;
  sessionType: string;
  targetDistanceKm: number | null;
  targetPaceMinPerKm: number | null;
  notes: string | null;
  log: WorkoutLog | null;
}

export interface DashboardData {
  user: { id: string; name: string; fitnessLevel: string; raceDate: string };
  raceDate: string;
  daysUntilRace: number;
  currentWeek: number;
  totalWeeks: number;
  thisWeekWorkouts: Workout[];
  weeklyTargetKm: number;
  weeklyActualKm: number;
  completedCount: number;
  totalWorkoutCount: number;
}

export const getDashboard = () => api.get<DashboardData>("/api/dashboard");
