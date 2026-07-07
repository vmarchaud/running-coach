CREATE TABLE IF NOT EXISTS `coach_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL,
  `content` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `coach_messages_user_created` ON `coach_messages` (`user_id`, `created_at`);
