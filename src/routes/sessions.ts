import { Hono } from "hono";
import { createDb } from "../../db";
import {
  getTrainings,
  getTrainingInfo,
  getPlannedTrainings,
  createTraining,
  createPlannedTraining,
} from "../lib/nolioApi";
import { withNolioToken } from "../lib/nolioSession";
import { mapNolioTraining, isFulfilledBy, Session } from "../lib/sessionMapper";
import { addDays, isoDate, weekMondayFromDate } from "../lib/dateUtils";

type Bindings = { DB: D1Database; NOLIO_CLIENT_SECRET: string };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function withToken<T>(c: any, fn: (token: string) => Promise<T>): Promise<T> {
  const db = createDb(c.env.DB);
  return withNolioToken(db, c.get("userId"), c.env.NOLIO_CLIENT_SECRET, fn);
}

// GET /api/sessions/week?weekStart=YYYY-MM-DD — planned + completed sessions for
// the week containing weekStart (any day in that week works; defaults to today).
router.get("/week", async (c) => {
  const weekStartParam = c.req.query("weekStart");
  const anchor = weekStartParam ? new Date(weekStartParam + "T00:00:00") : new Date();
  const monday = weekMondayFromDate(anchor);
  const sunday = addDays(monday, 6);
  const from = isoDate(monday);
  const to = isoDate(sunday);

  const { planned: allPlanned, completed } = await withToken(c, async (token) => {
    const [plannedRaw, completedRaw] = await Promise.all([
      getPlannedTrainings(token, { from, to, limit: 50 }),
      getTrainings(token, { from, to, limit: 50 }),
    ]);
    return {
      planned: (plannedRaw as any[]).map((t) => mapNolioTraining(t, false)),
      completed: (completedRaw as any[]).map((t) => mapNolioTraining(t, true)),
    };
  });

  // Drop planned sessions already fulfilled by a synced-in completed training
  // (e.g. run on Coros, auto-uploaded to Nolio) so they don't show twice.
  const planned = allPlanned.filter((p) => !completed.some((done) => isFulfilledBy(p, done)));

  const weeklyTargetKm = allPlanned.reduce((s, x) => s + (x.distance ?? 0), 0);
  const weeklyActualKm = completed.reduce((s, x) => s + (x.distance ?? 0), 0);

  return c.json({
    weekStart: from,
    weekEnd: to,
    planned,
    completed,
    weeklyTargetKm: Math.round(weeklyTargetKm * 10) / 10,
    weeklyActualKm: Math.round(weeklyActualKm * 10) / 10,
  });
});

// GET /api/sessions/plan — upcoming planned sessions grouped by week (Monday date key).
router.get("/plan", async (c) => {
  const today = new Date();
  const from = isoDate(today);
  const to = isoDate(addDays(today, 16 * 7)); // 16-week horizon

  const allPlanned = await withToken(c, async (token) => {
    const [plannedRaw, completedRaw] = await Promise.all([
      getPlannedTrainings(token, { from, to, limit: 200 }),
      getTrainings(token, { from, to: isoDate(today), limit: 50 }),
    ]);
    const planned = (plannedRaw as any[]).map((t) => mapNolioTraining(t, false));
    const completed = (completedRaw as any[]).map((t) => mapNolioTraining(t, true));
    return planned.filter((p) => !completed.some((done) => isFulfilledBy(p, done)));
  });

  const planned = allPlanned.sort((a, b) => a.dateStart.localeCompare(b.dateStart));

  const byWeek: Record<string, Session[]> = {};
  for (const s of planned) {
    const weekStart = isoDate(weekMondayFromDate(new Date(s.dateStart + "T00:00:00")));
    if (!byWeek[weekStart]) byWeek[weekStart] = [];
    byWeek[weekStart].push(s);
  }

  return c.json({ byWeek });
});

// GET /api/sessions/history?before=YYYY-MM-DD&limit=20 — completed sessions, most recent first.
// Nolio's API only supports a date-range cursor (no offset), so pagination walks
// backwards using the oldest date_start seen so far as the next page's `to`.
router.get("/history", async (c) => {
  const before = c.req.query("before");
  const limit = parseInt(c.req.query("limit") ?? "20", 10);

  const sessions = await withToken(c, async (token) => {
    const raw = await getTrainings(token, { to: before, limit });
    return (raw as any[]).map((t) => mapNolioTraining(t, true));
  });

  return c.json({ sessions });
});

// GET /api/sessions/:id?type=planned|completed
router.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const type = c.req.query("type") === "planned" ? "planned" : "completed";

  const session = await withToken(c, async (token) => {
    if (type === "completed") {
      const info = (await getTrainingInfo(token, id)) as any;
      return { ...mapNolioTraining(info, true), streams: info.streams, laps: info.laps, zones: info.zones };
    }
    const raw = await getPlannedTrainings(token, { id });
    const match = (raw as any[])[0];
    if (!match) throw new Error("Not found");
    return mapNolioTraining(match, false);
  });

  return c.json(session);
});

// POST /api/sessions/log — record a completed training.
router.post("/log", async (c) => {
  const body = await c.req.json<{
    name: string;
    sportId: number;
    dateStart: string;
    duration?: number;
    distance?: number;
    elevationGain?: number;
    description?: string;
    rpe?: number;
    feeling?: number;
  }>();

  const result = await withToken(c, (token) =>
    createTraining(token, {
      sport_id: body.sportId,
      name: body.name,
      date_start: body.dateStart,
      duration: body.duration,
      distance: body.distance,
      elevation_gain: body.elevationGain,
      description: body.description,
      rpe: body.rpe,
      feeling: body.feeling,
    })
  );

  return c.json(result, 201);
});

// POST /api/sessions/schedule — create a planned training.
router.post("/schedule", async (c) => {
  const body = await c.req.json<{
    name: string;
    sportId: number;
    dateStart: string;
    duration?: number;
    distance?: number;
    elevationGain?: number;
    description?: string;
    rpe?: number;
  }>();

  const result = await withToken(c, (token) =>
    createPlannedTraining(token, {
      sport_id: body.sportId,
      name: body.name,
      date_start: body.dateStart,
      duration: body.duration,
      distance: body.distance,
      elevation_gain: body.elevationGain,
      description: body.description,
      rpe: body.rpe,
    })
  );

  return c.json(result, 201);
});

export default router;
