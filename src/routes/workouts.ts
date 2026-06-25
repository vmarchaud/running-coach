import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { createDb } from "../../db";
import { workouts, workoutLogs, trainingPlans } from "../../db/schema";
import { isoDate, addDays, weekMondayFromDate } from "../lib/dateUtils";

type Bindings = { DB: D1Database };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/workouts?week=N — current week if omitted
router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const weekParam = c.req.query("week");

  let workoutRows;

  if (weekParam) {
    const weekNum = parseInt(weekParam, 10);
    workoutRows = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.userId, userId), eq(workouts.weekNumber, weekNum)))
      .orderBy(asc(workouts.scheduledDate))
      .all();
  } else {
    const today = new Date();
    const monday = weekMondayFromDate(today);
    const sunday = addDays(monday, 6);

    const { gte, lte } = await import("drizzle-orm");
    workoutRows = await db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.scheduledDate, isoDate(monday)),
          lte(workouts.scheduledDate, isoDate(sunday))
        )
      )
      .orderBy(asc(workouts.scheduledDate))
      .all();
  }

  const ids = workoutRows.map((w) => w.id);
  const logs =
    ids.length > 0
      ? await db
          .select()
          .from(workoutLogs)
          .where(eq(workoutLogs.userId, userId))
          .all()
          .then((all) => all.filter((l) => ids.includes(l.workoutId)))
      : [];

  const logByWorkoutId = Object.fromEntries(logs.map((l) => [l.workoutId, l]));

  return c.json(workoutRows.map((w) => ({ ...w, log: logByWorkoutId[w.id] ?? null })));
});

// GET /api/workouts/all — full plan grouped by week
router.get("/all", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const plan = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.userId, userId))
    .get();

  const allWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(asc(workouts.scheduledDate))
    .all();

  const allLogs = await db
    .select()
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
    .all();

  const logByWorkoutId = Object.fromEntries(allLogs.map((l) => [l.workoutId, l]));

  const byWeek: Record<number, any[]> = {};
  for (const w of allWorkouts) {
    if (!byWeek[w.weekNumber]) byWeek[w.weekNumber] = [];
    byWeek[w.weekNumber].push({ ...w, log: logByWorkoutId[w.id] ?? null });
  }

  return c.json({ totalWeeks: plan?.totalWeeks ?? 0, byWeek });
});

// GET /api/workouts/:id
router.get("/:id", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .get();

  if (!workout) return c.json({ error: "Not found" }, 404);

  const log = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.workoutId, id), eq(workoutLogs.userId, userId)))
    .get();

  return c.json({ ...workout, log: log ?? null });
});

// POST /api/workouts/:id/log
router.post("/:id/log", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .get();

  if (!workout) return c.json({ error: "Not found" }, 404);

  const existing = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.workoutId, id), eq(workoutLogs.userId, userId)))
    .get();

  if (existing) return c.json({ error: "Already logged" }, 409);

  const body = await c.req.json<{
    actualDistanceKm?: number;
    actualDurationMinutes?: number;
    perceivedEffort?: string;
    notes?: string;
  }>();

  const logId = crypto.randomUUID();
  await db.insert(workoutLogs).values({
    id: logId,
    workoutId: id,
    userId,
    actualDistanceKm: body.actualDistanceKm ?? null,
    actualDurationMinutes: body.actualDurationMinutes ?? null,
    perceivedEffort: body.perceivedEffort ?? null,
    notes: body.notes ?? null,
  });

  const log = await db.select().from(workoutLogs).where(eq(workoutLogs.id, logId)).get();
  return c.json(log, 201);
});

// DELETE /api/workouts/:id/log
router.delete("/:id/log", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  await db
    .delete(workoutLogs)
    .where(and(eq(workoutLogs.workoutId, id), eq(workoutLogs.userId, userId)));

  return c.json({ ok: true });
});

export default router;
