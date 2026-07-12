import { NOLIO_PARTNER_ID } from "./config";

const BASE = "https://www.nolio.io/api";

export class NolioApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Cheap non-cryptographic hash — just namespaces the Workers Cache API by Nolio
// account without storing the access token itself as a cache key.
function fingerprint(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function nolioGet(accessToken: string, path: string, params: object = {}, cacheTtlSeconds = 0) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = `${BASE}${path}${qs.toString() ? `?${qs}` : ""}`;

  // Only cache endpoints our own writes never affect (see call sites below) —
  // get/training/ and get/planned/training/ are deliberately never cached here
  // since logging or scheduling a session needs to show up immediately on the
  // very next read, and the Workers Cache API has no way to invalidate by key
  // prefix, only by exact request.
  const cache = cacheTtlSeconds > 0 ? (caches as any).default : null;
  const cacheKey = cache
    ? new Request(`https://nolio-cache.internal/${fingerprint(accessToken)}${path}?${qs}`)
    : null;

  if (cache && cacheKey) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached.json();
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new NolioApiError(res.status, await res.text());
  const data = await res.json();

  if (cache && cacheKey) {
    await cache.put(
      cacheKey,
      new Response(JSON.stringify(data), {
        headers: { "Cache-Control": `max-age=${cacheTtlSeconds}`, "content-type": "application/json" },
      })
    );
  }

  return data;
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
// Trainings and planned trainings are never cached — they're exactly what our
// own log/schedule writes need to reflect on the very next read.

export const getTrainings = (token: string, params: DateRangeParams & { id?: number } = {}) =>
  nolioGet(token, "/get/training/", params);

export const getTrainingInfo = (token: string, id: number) =>
  nolioGet(token, "/get/training/info/", { id });

export const getPlannedTrainings = (token: string, params: DateRangeParams & { id?: number } = {}) =>
  nolioGet(token, "/get/planned/training/", params);

// These are read-only from our app's perspective (nothing here ever writes to
// them), so a short cache meaningfully cuts duplicate calls — e.g. the coach
// and the dashboard both asking for health metrics within the same minute.
export const getHrvMeasures = (token: string, params: DateRangeParams & { with_raw?: boolean } = {}) =>
  nolioGet(token, "/get/hrv/measures/", params, 60);

export const getUserMeta = (token: string, params: DateRangeParams = {}) =>
  nolioGet(token, "/get/user/meta/", params, 60);

export const getRecords = (
  token: string,
  params: { cat: string; record_type: "time" | "distance"; from?: string; to?: string; sports?: string; items?: string }
) => nolioGet(token, "/get/records/", params, 60);

export const getUser = (token: string) => nolioGet(token, "/get/user/", {}, 300);

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

export interface Objective {
  id: number;
  name: string;
  sport: string | null;
  dateStart: string;
  description: string | null;
}

// Nolio models a race/goal as a planned training with is_competition: true.
// Not cached — it's driven by the same planned-training data as everything else.
export async function getUpcomingObjectives(token: string): Promise<Objective[]> {
  const today = new Date().toISOString().slice(0, 10);
  const twoYearsOut = new Date();
  twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);

  const raw = (await getPlannedTrainings(token, {
    from: today,
    to: twoYearsOut.toISOString().slice(0, 10),
    limit: 200,
  })) as any[];

  return raw
    .filter((t) => t.is_competition)
    .map((t) => ({
      id: t.nolio_id,
      name: t.name,
      sport: t.sport ?? null,
      dateStart: t.date_start,
      description: t.description || null,
    }))
    .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
}
