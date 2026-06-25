import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users, trainingPlans, workouts } from "../../db/schema";
import { generatePlan } from "../lib/planGenerator";

type Bindings = { DB: D1Database };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.post("/", async (c) => {
  const body = await c.req.json<{
    id: string;
    name: string;
    fitnessLevel: string;
    daysPerWeek: number;
    raceDate: string;
    targetTimeMinutes?: number | null;
  }>();

  const db = createDb(c.env.DB);

  const existing = await db.select().from(users).where(eq(users.id, body.id)).get();
  if (existing) {
    return c.json({ error: "User already exists" }, 409);
  }

  const planId = crypto.randomUUID();
  const today = new Date();

  const { totalWeeks, workouts: workoutRows } = generatePlan(
    {
      id: body.id,
      fitnessLevel: body.fitnessLevel as any,
      daysPerWeek: body.daysPerWeek as any,
      raceDate: body.raceDate,
      targetTimeMinutes: body.targetTimeMinutes,
    },
    planId,
    today
  );

  await db.batch([
    db.insert(users).values({
      id: body.id,
      name: body.name,
      fitnessLevel: body.fitnessLevel,
      daysPerWeek: body.daysPerWeek,
      raceDate: body.raceDate,
      targetTimeMinutes: body.targetTimeMinutes ?? null,
    }),
    db.insert(trainingPlans).values({
      id: planId,
      userId: body.id,
      totalWeeks,
    }),
    ...workoutRows.map((w) => db.insert(workouts).values(w)),
  ]);

  return c.json({ user: body, plan: { id: planId, totalWeeks }, workoutCount: workoutRows.length });
});

router.get("/me", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: "Not found" }, 404);

  const plan = await db.select().from(trainingPlans).where(eq(trainingPlans.userId, userId)).get();

  return c.json({ user, plan });
});

export default router;
