import { Hono } from "hono";
import { eq, and, gte, lte } from "drizzle-orm";
import { createDb } from "../../db";
import { users, trainingPlans, workouts, workoutLogs } from "../../db/schema";
import { isoDate, addDays, weekMondayFromDate, diffDays } from "../lib/dateUtils";

type Bindings = { DB: D1Database };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: "Not found" }, 404);

  const plan = await db.select().from(trainingPlans).where(eq(trainingPlans.userId, userId)).get();
  if (!plan) return c.json({ error: "No plan found" }, 404);

  const today = new Date();
  const monday = weekMondayFromDate(today);
  const sunday = addDays(monday, 6);

  const thisWeekWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.scheduledDate, isoDate(monday)),
        lte(workouts.scheduledDate, isoDate(sunday))
      )
    )
    .all();

  const workoutIds = thisWeekWorkouts.map((w) => w.id);
  const logs =
    workoutIds.length > 0
      ? await db
          .select()
          .from(workoutLogs)
          .where(eq(workoutLogs.userId, userId))
          .all()
          .then((all) => all.filter((l) => workoutIds.includes(l.workoutId)))
      : [];

  const logByWorkoutId = Object.fromEntries(logs.map((l) => [l.workoutId, l]));

  const thisWeekWorkoutsWithLog = thisWeekWorkouts.map((w) => ({
    ...w,
    log: logByWorkoutId[w.id] ?? null,
  }));

  const weeklyTarget = thisWeekWorkouts.reduce((sum, w) => sum + (w.targetDistanceKm ?? 0), 0);
  const weeklyActual = logs.reduce((sum, l) => sum + (l.actualDistanceKm ?? 0), 0);

  const raceDate = new Date(user.raceDate);
  const daysUntilRace = Math.max(0, diffDays(today, raceDate));

  // Figure out current week number
  const firstWorkout = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(workouts.scheduledDate)
    .limit(1)
    .get();

  let currentWeek = 1;
  if (firstWorkout) {
    const planStart = new Date(firstWorkout.scheduledDate);
    const weeksPassed = Math.floor(diffDays(planStart, today) / 7);
    currentWeek = Math.max(1, Math.min(weeksPassed + 1, plan.totalWeeks));
  }

  // Count completed workouts for overall progress
  const allLogs = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId)).all();
  const completedCount = allLogs.length;
  const totalWorkoutCount = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .all()
    .then((r) => r.length);

  return c.json({
    user,
    raceDate: user.raceDate,
    daysUntilRace,
    currentWeek,
    totalWeeks: plan.totalWeeks,
    thisWeekWorkouts: thisWeekWorkoutsWithLog,
    weeklyTargetKm: Math.round(weeklyTarget * 10) / 10,
    weeklyActualKm: Math.round(weeklyActual * 10) / 10,
    completedCount,
    totalWorkoutCount,
  });
});

export default router;
