import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { createDb } from "../../db";
import { coachMessages } from "../../db/schema";
import { runCoachAgent } from "../lib/coachAgent";
import type { ClaudeMessage } from "../lib/claude";

type Bindings = {
  DB: D1Database;
  NOLIO_CLIENT_SECRET: string;
  CF_AI_GATEWAY_TOKEN: string;
};
type Variables = { userId: string };

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/coach/messages — full conversation history, persisted server-side so it
// survives a refresh and follows the athlete across devices (keyed by their
// Nolio-authenticated userId, not a per-browser localStorage entry).
router.get("/messages", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const rows = await db
    .select()
    .from(coachMessages)
    .where(eq(coachMessages.userId, userId))
    .orderBy(asc(coachMessages.createdAt))
    .all();

  const messages: ClaudeMessage[] = rows.map((r) => ({
    role: r.role as "user" | "assistant",
    content: JSON.parse(r.content),
  }));

  return c.json({ messages });
});

// POST /api/coach/chat — body: { message: string }. Server loads prior history,
// appends the new user message, runs the agent, and persists every message
// produced this turn (including tool_use/tool_result blocks the agent needs for
// context on the next call).
router.post("/chat", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ message: string }>();

  if (!body.message || !body.message.trim()) {
    return c.json({ error: "message is required" }, 400);
  }

  const db = createDb(c.env.DB);

  const rows = await db
    .select()
    .from(coachMessages)
    .where(eq(coachMessages.userId, userId))
    .orderBy(asc(coachMessages.createdAt))
    .all();

  const history: ClaudeMessage[] = rows.map((r) => ({
    role: r.role as "user" | "assistant",
    content: JSON.parse(r.content),
  }));

  const withUserMessage: ClaudeMessage[] = [...history, { role: "user", content: body.message }];

  try {
    const { reply, messages } = await runCoachAgent(
      db,
      userId,
      c.env.NOLIO_CLIENT_SECRET,
      c.env.CF_AI_GATEWAY_TOKEN,
      withUserMessage
    );

    const newMessages = messages.slice(history.length);
    if (newMessages.length > 0) {
      await db.batch(
        newMessages.map((m) =>
          db.insert(coachMessages).values({
            id: crypto.randomUUID(),
            userId,
            role: m.role,
            content: JSON.stringify(m.content),
          })
        ) as any
      );
    }

    return c.json({ reply, messages });
  } catch (e: any) {
    return c.json({ error: e.message ?? "Coach agent failed" }, 500);
  }
});

export default router;
