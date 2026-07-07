import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users } from "../../db/schema";

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

  await db.insert(users).values({
    id: body.id,
    name: body.name,
    fitnessLevel: body.fitnessLevel,
    daysPerWeek: body.daysPerWeek,
    raceDate: body.raceDate,
    targetTimeMinutes: body.targetTimeMinutes ?? null,
  });

  return c.json({ user: body });
});

router.get("/me", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: "Not found" }, 404);

  return c.json({ user });
});

export default router;
