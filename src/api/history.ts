import { api } from "./client";
import type { Workout, WorkoutLog } from "./dashboard";

export interface HistoryItem extends WorkoutLog {
  workout: Workout | null;
}

export const getHistory = (limit = 20, offset = 0) =>
  api.get<{ logs: HistoryItem[]; total: number }>(
    `/api/history?limit=${limit}&offset=${offset}`
  );
