import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Onboarding profile used to personalize the coach (fitness level, race date,
// target time). Actual training data — planned sessions, completed workouts —
// lives entirely in Nolio; we don't mirror it locally.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fitnessLevel: text("fitness_level").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  raceDate: text("race_date").notNull(),
  targetTimeMinutes: integer("target_time_minutes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const nolioTokens = sqliteTable("nolio_tokens", {
  userId: text("user_id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  nolioUserId: text("nolio_user_id"),
  nolioFirstName: text("nolio_first_name"),
  nolioLastName: text("nolio_last_name"),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const coachMessages = sqliteTable("coach_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  // JSON-serialized string | ClaudeContentBlock[], preserving tool_use/tool_result
  // blocks so the agent keeps full context across turns.
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
