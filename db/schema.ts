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
  // Last time the scheduled check-in ran for this athlete — gates the cron
  // job's cadence (roughly every 2-3 days), not read/written anywhere else.
  lastCheckinAt: text("last_checkin_at"),
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

// Durable notes the coach saves about the athlete (preferences, injuries,
// feedback on past sessions, motivational triggers). Deliberately separate from
// coach_messages — clearing the conversation resets the chat, not what the
// coach has learned.
export const coachMemories = sqliteTable("coach_memories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// Web Push subscriptions — one row per browser/device the athlete has enabled
// notifications on.
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// Personal strength maxes (1RM per exercise), set by the athlete in Settings.
// Profile data like fitness level/target time, not training history, so it
// belongs here rather than in Nolio — the coach reads it to convert a
// %1RM-based strength session (e.g. "4x5 @ 75% 1RM") into an actual working
// weight instead of leaving the athlete to do that math.
export const strengthMaxes = sqliteTable("strength_maxes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  exercise: text("exercise").notNull(),
  valueKg: integer("value_kg").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Not a mirror of training data — Nolio stays the source of truth for that.
// This is only an index of the id_partner values the coach itself assigned
// when creating a planned training, since Nolio's update/delete endpoints are
// keyed by id_partner but its GET endpoints never return it (only nolio_id).
// Without this, the coach could only update/delete a session it created
// earlier in the very same conversation.
export const plannedTrainingRefs = sqliteTable("planned_training_refs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  idPartner: integer("id_partner").notNull(),
  dateStart: text("date_start").notNull(),
  sportId: integer("sport_id").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
