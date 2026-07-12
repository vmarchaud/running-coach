import { desc, eq } from "drizzle-orm";
import type { Db } from "../../db";
import { coachMemories } from "../../db/schema";

const MAX_MEMORIES_PER_USER = 200;

export async function saveMemory(db: Db, userId: string, content: string): Promise<{ ok: true }> {
  await db.insert(coachMemories).values({ id: crypto.randomUUID(), userId, content });

  // Keep the table bounded — drop the oldest entries beyond the cap.
  const all = await db
    .select({ id: coachMemories.id })
    .from(coachMemories)
    .where(eq(coachMemories.userId, userId))
    .orderBy(desc(coachMemories.createdAt))
    .all();

  const overflow = all.slice(MAX_MEMORIES_PER_USER);
  for (const row of overflow) {
    await db.delete(coachMemories).where(eq(coachMemories.id, row.id));
  }

  return { ok: true };
}

export async function loadMemories(db: Db, userId: string, limit = 50): Promise<string[]> {
  const rows = await db
    .select()
    .from(coachMemories)
    .where(eq(coachMemories.userId, userId))
    .orderBy(desc(coachMemories.createdAt))
    .limit(limit)
    .all();

  return rows.map((r) => r.content);
}
