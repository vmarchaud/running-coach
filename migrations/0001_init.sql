CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `fitness_level` text NOT NULL,
  `days_per_week` integer NOT NULL,
  `race_date` text NOT NULL,
  `target_time_minutes` integer,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS `training_plans` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `total_weeks` integer NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS `workouts` (
  `id` text PRIMARY KEY NOT NULL,
  `plan_id` text NOT NULL REFERENCES `training_plans`(`id`),
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `week_number` integer NOT NULL,
  `day_of_week` integer NOT NULL,
  `scheduled_date` text NOT NULL,
  `session_type` text NOT NULL,
  `target_distance_km` real,
  `target_pace_min_per_km` real,
  `notes` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS `workout_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `workout_id` text NOT NULL REFERENCES `workouts`(`id`),
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `completed_at` text NOT NULL DEFAULT (datetime('now')),
  `actual_distance_km` real,
  `actual_duration_minutes` real,
  `perceived_effort` text,
  `notes` text
);

CREATE INDEX IF NOT EXISTS `workouts_user_date` ON `workouts` (`user_id`, `scheduled_date`);
CREATE INDEX IF NOT EXISTS `workouts_plan_week` ON `workouts` (`plan_id`, `week_number`);
CREATE INDEX IF NOT EXISTS `workout_logs_user` ON `workout_logs` (`user_id`);
