import { api } from "./client";
import type { Session } from "./sessions";

export interface DashboardData {
  user: { id: string; name: string; raceDate: string };
  daysUntilRace: number;
  sessions: Session[];
  plannedCount: number;
  completedCount: number;
  weeklyTargetKm: number;
  weeklyActualKm: number;
}

export const getDashboard = () => api.get<DashboardData>("/api/dashboard");
