import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { createDb, type Db } from "../../db";
import { users, nolioTokens, coachMessages, pushSubscriptions } from "../../db/schema";
import { runCoachAgent } from "./coachAgent";
import { sendPushNotification } from "./webPush";
import type { ClaudeMessage } from "./claude";

// Cron runs daily; this gate keeps the actual per-athlete cadence at roughly
// every 2-3 days rather than every single run.
const CHECKIN_INTERVAL_HOURS = 60;

const CHECKIN_PROMPT =
  "It's been a couple of days since we last talked. Check my recent training, recovery (HRV/sleep), and how many sessions I have planned for the next week. If my plan is running low, schedule what's needed to keep me on track for my goal. Give me a short, friendly update on where things stand.";

// The coach's reply is markdown (headers, tables, bold) meant for the chat's
// rendered view — a push notification is plain text, so **bold**, | table |
// pipes, # headers, and [links](url) need stripping or they show up as raw
// literal syntax in the OS notification tray.
function stripMarkdownForNotification(md: string): string {
  return md
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?$/gm, "") // table separator rows
    .replace(/\|/g, " ")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface CheckinEnv {
  DB: D1Database;
  NOLIO_CLIENT_SECRET: string;
  NVIDIA_API_KEY: string;
  VAPID_PRIVATE_KEY: string;
}

export async function runScheduledCheckins(env: CheckinEnv): Promise<void> {
  const db = createDb(env.DB);
  const cutoff = new Date(Date.now() - CHECKIN_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

  const candidates = await db
    .select()
    .from(users)
    .where(or(isNull(users.lastCheckinAt), lt(users.lastCheckinAt, cutoff)))
    .all();

  for (const user of candidates) {
    const connected = await db.select().from(nolioTokens).where(eq(nolioTokens.userId, user.id)).get();
    if (!connected) continue; // nothing to check in on without a live Nolio session

    try {
      await checkinForUser(db, user.id, env);
    } catch {
      // One athlete's failure (Nolio token expired, model error, etc.)
      // shouldn't block check-ins for everyone else.
    }
  }
}

async function checkinForUser(db: Db, userId: string, env: CheckinEnv): Promise<void> {
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

  const withPrompt: ClaudeMessage[] = [...history, { role: "user", content: CHECKIN_PROMPT }];

  const { reply, messages } = await runCoachAgent(
    db,
    userId,
    env.NOLIO_CLIENT_SECRET,
    env.NVIDIA_API_KEY,
    withPrompt
  );

  // Persist exactly like a normal chat turn, so this shows up in the
  // athlete's Coach tab and they can reply to continue the thread.
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

  await db.update(users).set({ lastCheckinAt: new Date().toISOString() }).where(eq(users.id, userId));

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all();
  if (subs.length === 0) return;

  const plainReply = stripMarkdownForNotification(reply);
  const summary = plainReply.length > 140 ? `${plainReply.slice(0, 137)}...` : plainReply;

  for (const sub of subs) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      env.VAPID_PRIVATE_KEY,
      { title: "Your coach checked in", body: summary || "See what's new.", url: "/?tab=coach" }
    );

    if (!result.ok && result.gone) {
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.id, sub.id)));
    }
  }
}
