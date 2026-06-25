import { api } from "./client";
import type { Workout } from "./dashboard";

export interface FullPlanData {
  totalWeeks: number;
  byWeek: Record<string, Workout[]>;
}

export const getWorkouts = (week?: number) =>
  api.get<Workout[]>(week ? `/api/workouts?week=${week}` : "/api/workouts");

export const getFullPlan = () => api.get<FullPlanData>("/api/workouts/all");

export const getWorkout = (id: string) => api.get<Workout>(`/api/workouts/${id}`);

export const logWorkout = (
  id: string,
  data: {
    actualDistanceKm?: number;
    actualDurationMinutes?: number;
    perceivedEffort?: string;
    notes?: string;
  }
) => api.post(`/api/workouts/${id}/log`, data);

export const unlogWorkout = (id: string) => api.delete(`/api/workouts/${id}/log`);
