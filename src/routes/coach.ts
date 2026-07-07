import { Hono } from "hono";
import { createDb } from "../../db";
import { runCoachAgent } from "../lib/coachAgent";
import type { ClaudeMessage } from "../lib/claude";

type Bindings = {
  DB: D1Database;
  NOLIO_CLIENT_SECRET: string;
  CF_AI_GATEWAY_TOKEN: string;
};
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/coach/chat — body: { messages: ClaudeMessage[] } (full running history from the client)
router.post("/chat", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ messages: ClaudeMessage[] }>();

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: "messages array is required" }, 400);
  }

  const db = createDb(c.env.DB);

  try {
    const { reply, messages } = await runCoachAgent(
      db,
      userId,
      c.env.NOLIO_CLIENT_SECRET,
      c.env.CF_AI_GATEWAY_TOKEN,
      body.messages
    );
    return c.json({ reply, messages });
  } catch (e: any) {
    return c.json({ error: e.message ?? "Coach agent failed" }, 500);
  }
});

export default router;
