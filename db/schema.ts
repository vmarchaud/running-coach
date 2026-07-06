import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fitnessLevel: text("fitness_level").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  raceDate: text("race_date").notNull(),
  targetTimeMinutes: integer("target_time_minutes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const trainingPlans = sqliteTable("training_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  totalWeeks: integer("total_weeks").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const workouts = sqliteTable("workouts", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => trainingPlans.id),
  userId: text("user_id").notNull().references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  scheduledDate: text("scheduled_date").notNull(),
  sessionType: text("session_type").notNull(),
  targetDistanceKm: real("target_distance_km"),
  targetPaceMinPerKm: real("target_pace_min_per_km"),
  notes: text("notes"),
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

export const workoutLogs = sqliteTable("workout_logs", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workouts.id),
  userId: text("user_id").notNull().references(() => users.id),
  completedAt: text("completed_at").notNull().default(sql`(datetime('now'))`),
  actualDistanceKm: real("actual_distance_km"),
  actualDurationMinutes: real("actual_duration_minutes"),
  perceivedEffort: text("perceived_effort"),
  notes: text("notes"),
});
