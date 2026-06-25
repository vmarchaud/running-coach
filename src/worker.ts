import { Hono } from "hono";
import { logger } from "hono/logger";
import usersRouter from "./routes/users";
import dashboardRouter from "./routes/dashboard";
import workoutsRouter from "./routes/workouts";
import historyRouter from "./routes/history";

type Bindings = { ASSETS: Fetcher; DB: D1Database };
type Variables = { userId: string };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());

// Extract userId from header for all /api routes except POST /api/users
app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/users" && c.req.method === "POST") {
    return next();
  }
  const userId = c.req.header("X-User-Id");
  if (!userId) return c.json({ error: "Missing X-User-Id header" }, 401);
  c.set("userId", userId);
  return next();
});

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/users", usersRouter);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/workouts", workoutsRouter);
app.route("/api/history", historyRouter);

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
