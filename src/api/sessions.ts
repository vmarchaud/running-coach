import { api } from "./client";

export interface Session {
  id: number;
  name: string;
  sport: string | null;
  sportId: number | null;
  dateStart: string;
  hourStart: string | null;
  duration: number | null;
  distance: number | null;
  elevationGain: number | null;
  rpe: number | null;
  description: string | null;
  isCompleted: boolean;
  plannedName: string | null;
  plannedSportId: number | null;
  streams?: unknown;
  laps?: unknown;
  zones?: unknown;
}

export const getWeekSessions = () =>
  api.get<{ planned: Session[]; completed: Session[]; weeklyTargetKm: number; weeklyActualKm: number }>(
    "/api/sessions/week"
  );

export const getPlanSessions = () => api.get<{ byWeek: Record<string, Session[]> }>("/api/sessions/plan");

export const getHistorySessions = (before?: string, limit = 20) =>
  api.get<{ sessions: Session[] }>(
    `/api/sessions/history?limit=${limit}${before ? `&before=${before}` : ""}`
  );

export const getSessionDetail = (id: number, isCompleted: boolean) =>
  api.get<Session>(`/api/sessions/${id}?type=${isCompleted ? "completed" : "planned"}`);

export interface LogSessionInput {
  name: string;
  sportId: number;
  dateStart: string;
  duration?: number;
  distance?: number;
  elevationGain?: number;
  description?: string;
  rpe?: number;
  feeling?: number;
}

export const logSession = (data: LogSessionInput) => api.post("/api/sessions/log", data);

export interface ScheduleSessionInput {
  name: string;
  sportId: number;
  dateStart: string;
  duration?: number;
  distance?: number;
  elevationGain?: number;
  description?: string;
  rpe?: number;
}

export const scheduleSession = (data: ScheduleSessionInput) => api.post("/api/sessions/schedule", data);
