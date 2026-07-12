import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users } from "../../db/schema";
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

export default router;
