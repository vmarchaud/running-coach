import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { createDb } from "../../db";
import { workoutLogs, workouts } from "../../db/schema";

type Bindings = { DB: D1Database };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const limit = parseInt(c.req.query("limit") ?? "20", 10);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  const allLogs = await db
    .select()
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
    .orderBy(desc(workoutLogs.completedAt))
    .all();

  const total = allLogs.length;
  const paginated = allLogs.slice(offset, offset + limit);

  const workoutIds = paginated.map((l) => l.workoutId);
  const workoutRows =
    workoutIds.length > 0
      ? await db
          .select()
          .from(workouts)
          .where(eq(workouts.userId, userId))
          .all()
          .then((all) => all.filter((w) => workoutIds.includes(w.id)))
      : [];

  const workoutById = Object.fromEntries(workoutRows.map((w) => [w.id, w]));

  const logs = paginated.map((l) => ({
    ...l,
    workout: workoutById[l.workoutId] ?? null,
  }));

  return c.json({ logs, total });
});

export default router;
