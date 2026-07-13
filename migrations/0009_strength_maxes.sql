CREATE TABLE IF NOT EXISTS `strength_maxes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise` text NOT NULL,
	`value_kg` integer NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `strength_maxes_user_exercise` ON `strength_maxes` (`user_id`, `exercise`);
