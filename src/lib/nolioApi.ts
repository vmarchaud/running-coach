import { NOLIO_PARTNER_ID } from "./config";

const BASE = "https://www.nolio.io/api";

export class NolioApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function nolioGet(accessToken: string, path: string, params: object = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = `${BASE}${path}${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new NolioApiError(res.status, await res.text());
  return res.json();
}

async function nolioPost(accessToken: string, path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_partner: NOLIO_PARTNER_ID, ...body }),
  });
  if (!res.ok) throw new NolioApiError(res.status, await res.text());
  return res.json();
}

export interface DateRangeParams {
  from?: string;
  to?: string;
  limit?: number;
}

// --- Reads ---

export const getTrainings = (token: string, params: DateRangeParams & { id?: number } = {}) =>
  nolioGet(token, "/get/training/", params);

export const getTrainingInfo = (token: string, id: number) =>
  nolioGet(token, "/get/training/info/", { id });

export const getPlannedTrainings = (token: string, params: DateRangeParams & { id?: number } = {}) =>
  nolioGet(token, "/get/planned/training/", params);

export const getHrvMeasures = (token: string, params: DateRangeParams & { with_raw?: boolean } = {}) =>
  nolioGet(token, "/get/hrv/measures/", params);

export const getUserMeta = (token: string, params: DateRangeParams = {}) =>
  nolioGet(token, "/get/user/meta/", params);

export const getRecords = (
  token: string,
  params: { cat: string; record_type: "time" | "distance"; from?: string; to?: string; sports?: string; items?: string }
) => nolioGet(token, "/get/records/", params);

// --- Writes ---

export interface CreateTrainingInput {
  sport_id: number;
  name: string;
  date_start: string;
  description?: string;
  duration?: number;
  feeling?: number;
  rpe?: number;
  distance?: number;
  elevation_gain?: number;
}

export const createTraining = (token: string, input: CreateTrainingInput) =>
  nolioPost(token, "/create/training/", input);

export interface CreatePlannedTrainingInput {
  sport_id: number;
  name: string;
  date_start: string;
  description?: string;
  duration?: number;
  rpe?: number;
  distance?: number;
  elevation_gain?: number;
}

export const createPlannedTraining = (token: string, input: CreatePlannedTrainingInput) =>
  nolioPost(token, "/create/planned/training/", input);

// Nolio has no directory endpoint for sport_id — its own docs say to discover
// values from existing training/user data instead. This scans the athlete's own
// history (completed + planned) so we surface real IDs (e.g. Strength Training)
// instead of guessing.
export async function getKnownSports(token: string): Promise<{ sportId: number; sport: string }[]> {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const from = threeYearsAgo.toISOString().slice(0, 10);

  const [completed, planned] = await Promise.all([
    getTrainings(token, { from, limit: 200 }),
    getPlannedTrainings(token, { from, limit: 200 }),
  ]);

  const seen = new Map<number, string>();
  for (const t of [...(completed as any[]), ...(planned as any[])]) {
    if (t.sport_id != null && !seen.has(t.sport_id)) seen.set(t.sport_id, t.sport);
  }
  return Array.from(seen, ([sportId, sport]) => ({ sportId, sport }));
}
