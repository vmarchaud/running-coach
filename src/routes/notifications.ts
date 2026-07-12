import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createDb } from "../../db";
import { pushSubscriptions } from "../../db/schema";
import { VAPID_PUBLIC_KEY } from "../lib/config";

type Bindings = { DB: D1Database };
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.get("/vapid-public-key", (c) => c.json({ key: VAPID_PUBLIC_KEY }));

// POST /api/notifications/subscribe — store a browser's push subscription.
router.post("/subscribe", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ endpoint: string; keys: { p256dh: string; auth: string } }>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: "Invalid subscription" }, 400);
  }

  const db = createDb(c.env.DB);

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, body.endpoint)))
    .get();

  if (!existing) {
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
  }

  return c.json({ ok: true });
});

// DELETE /api/notifications/subscribe — remove this browser's subscription.
router.delete("/subscribe", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ endpoint: string }>();
  const db = createDb(c.env.DB);

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, body.endpoint)));

  return c.json({ ok: true });
});

export default router;
