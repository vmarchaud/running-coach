CREATE TABLE IF NOT EXISTS `planned_training_refs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`id_partner` integer NOT NULL,
	`date_start` text NOT NULL,
	`sport_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `planned_training_refs_user` ON `planned_training_refs` (`user_id`);
