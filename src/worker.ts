import { Hono } from "hono";
import { logger } from "hono/logger";
import { eq } from "drizzle-orm";
import { createDb } from "../db";
import { nolioTokens } from "../db/schema";
import usersRouter from "./routes/users";
import sessionsRouter from "./routes/sessions";
import nolioRouter from "./routes/nolio";
import coachRouter from "./routes/coach";
import notificationsRouter from "./routes/notifications";
import { runScheduledCheckins } from "./lib/checkin";

type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
  NOLIO_CLIENT_SECRET: string;
  NOLIO_REDIRECT_URI: string;
  NVIDIA_API_KEY: string;
  VAPID_PRIVATE_KEY: string;
};
type Variables = { userId: string };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());

const PUBLIC_PATHS = new Set(["/api/health", "/api/nolio/connect", "/api/nolio/callback"]);

// Every API route requires a userId backed by a real Nolio session — Nolio is the
// only sign-in mechanism, so an X-User-Id header alone is not sufficient auth.
app.use("/api/*", async (c, next) => {
  if (PUBLIC_PATHS.has(c.req.path)) {
    return next();
  }

  const userId = c.req.header("X-User-Id");
  if (!userId) return c.json({ error: "Missing X-User-Id header" }, 401);

  const db = createDb(c.env.DB);
  const session = await db
    .select({ userId: nolioTokens.userId })
    .from(nolioTokens)
    .where(eq(nolioTokens.userId, userId))
    .get();

  if (!session) return c.json({ error: "Not authenticated with Nolio" }, 401);

  c.set("userId", userId);
  return next();
});

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/users", usersRouter);
app.route("/api/sessions", sessionsRouter);
app.route("/api/nolio", nolioRouter);
app.route("/api/coach", coachRouter);
app.route("/api/notifications", notificationsRouter);

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  // Cloudflare Cron Trigger (see wrangler.json) — runs the coach's periodic
  // check-in/auto-planning job for every athlete due for one.
  scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledCheckins(env));
  },
};
