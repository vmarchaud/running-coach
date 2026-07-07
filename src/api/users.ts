import { api } from "./client";

export interface OnboardingData {
  id: string;
  name: string;
  fitnessLevel: string;
  daysPerWeek: number;
  raceDate: string;
  targetTimeMinutes?: number | null;
}

export const createUser = (data: OnboardingData) => api.post("/api/users", data);
export const getMe = () => api.get<{ user: any }>("/api/users/me");
