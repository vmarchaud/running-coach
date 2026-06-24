import { Hono } from "hono";
import { logger } from "hono/logger";

type Bindings = {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", logger());

// API routes
app.get("/api/health", (c) => c.json({ ok: true }));

// Serve the React SPA for all non-API routes
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
