import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { users } from "../../db/schema";
import { getTrainings, getPlannedTrainings } from "../lib/nolioApi";
import { withNolioToken } from "../lib/nolioSession";
import { mapNolioTraining, isFulfilledBy } from "../lib/sessionMapper";
import { addDays, isoDate, weekMondayFromDate, diffDays } from "../lib/dateUtils";

type Bindings = { DB: D1Database; NOLIO_CLIENT_SECRET: string };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: "Not found" }, 404);

  const today = new Date();
  const monday = weekMondayFromDate(today);
  const sunday = addDays(monday, 6);
  const from = isoDate(monday);
  const to = isoDate(sunday);

  const { planned: allPlanned, completed } = await withNolioToken(
    db,
    userId,
    c.env.NOLIO_CLIENT_SECRET,
    async (token) => {
      const [plannedRaw, completedRaw] = await Promise.all([
        getPlannedTrainings(token, { from, to, limit: 50 }),
        getTrainings(token, { from, to, limit: 50 }),
      ]);
      return {
        planned: (plannedRaw as any[]).map((t) => mapNolioTraining(t, false)),
        completed: (completedRaw as any[]).map((t) => mapNolioTraining(t, true)),
      };
    }
  );

  const planned = allPlanned.filter((p) => !completed.some((done) => isFulfilledBy(p, done)));
  const sessions = [...planned, ...completed].sort((a, b) => a.dateStart.localeCompare(b.dateStart));

  const weeklyTargetKm = allPlanned.reduce((s, x) => s + (x.distance ?? 0), 0);
  const weeklyActualKm = completed.reduce((s, x) => s + (x.distance ?? 0), 0);

  const raceDate = new Date(user.raceDate);
  const daysUntilRace = Math.max(0, diffDays(today, raceDate));

  return c.json({
    user: { id: user.id, name: user.name, raceDate: user.raceDate },
    daysUntilRace,
    sessions,
    plannedCount: allPlanned.length,
    completedCount: completed.length,
    weeklyTargetKm: Math.round(weeklyTargetKm * 10) / 10,
    weeklyActualKm: Math.round(weeklyActualKm * 10) / 10,
  });
});

export default router;
