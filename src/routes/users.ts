import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users, strengthMaxes } from "../../db/schema";
import { createCompetition, getUpcomingObjectives } from "../lib/nolioApi";
import { withNolioToken } from "../lib/nolioSession";

type Bindings = { DB: D1Database; NOLIO_CLIENT_SECRET: string };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

// Pushes the athlete's race goal into Nolio as a real competition, so it shows
// up in their Nolio calendar too instead of only living in our onboarding
// profile. Nolio has no field for a "weekly training days" target — there's no
// custom-metric or directory endpoint for it — so it's folded into the
// competition's description as context rather than invented as a fake field.
// Best-effort: skips if the athlete already has an upcoming Nolio objective
// (avoid creating a duplicate goal) and never blocks onboarding on failure.
async function pushRaceGoalToNolio(
  db: ReturnType<typeof createDb>,
  userId: string,
  nolioClientSecret: string,
  body: { daysPerWeek: number; raceDate: string; targetTimeMinutes?: number | null }
): Promise<void> {
  try {
    await withNolioToken(db, userId, nolioClientSecret, async (token) => {
      const existing = await getUpcomingObjectives(token);
      if (existing.length > 0) return;

      const name = body.targetTimeMinutes
        ? `Semi-marathon — target ${formatMinutes(body.targetTimeMinutes)}`
        : "Semi-marathon";

      await createCompetition(token, {
        sport_id: 2, // Running
        name,
        date_start: body.raceDate,
        description: `Training plan: ${body.daysPerWeek} days/week.`,
      });
    });
  } catch {
    // Not connected to Nolio, or a transient failure — onboarding still
    // succeeds locally; the goal just won't appear in Nolio yet.
  }
}

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

  await pushRaceGoalToNolio(db, body.id, c.env.NOLIO_CLIENT_SECRET, body);

  return c.json({ user: body });
});

router.get("/me", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: "Not found" }, 404);

  return c.json({ user });
});

// GET /api/users/strength-maxes — the athlete's saved 1RMs, set in Settings.
router.get("/strength-maxes", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const rows = await db.select().from(strengthMaxes).where(eq(strengthMaxes.userId, userId)).all();
  return c.json({ maxes: rows.map((r) => ({ exercise: r.exercise, valueKg: r.valueKg })) });
});

// PUT /api/users/strength-maxes — upsert one exercise's 1RM. A value of 0 or
// missing removes it (the athlete cleared the field in Settings).
router.put("/strength-maxes", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ exercise: string; valueKg: number }>();

  if (!body.exercise?.trim()) return c.json({ error: "exercise is required" }, 400);

  const db = createDb(c.env.DB);
  const exercise = body.exercise.trim();

  const existing = await db
    .select()
    .from(strengthMaxes)
    .where(and(eq(strengthMaxes.userId, userId), eq(strengthMaxes.exercise, exercise)))
    .get();

  if (!body.valueKg || body.valueKg <= 0) {
    if (existing) {
      await db
        .delete(strengthMaxes)
        .where(and(eq(strengthMaxes.userId, userId), eq(strengthMaxes.exercise, exercise)));
    }
    return c.json({ ok: true });
  }

  if (existing) {
    await db
      .update(strengthMaxes)
      .set({ valueKg: body.valueKg, updatedAt: new Date().toISOString() })
      .where(and(eq(strengthMaxes.userId, userId), eq(strengthMaxes.exercise, exercise)));
  } else {
    await db.insert(strengthMaxes).values({
      id: crypto.randomUUID(),
      userId,
      exercise,
      valueKg: body.valueKg,
    });
  }

  return c.json({ ok: true });
});

export default router;
