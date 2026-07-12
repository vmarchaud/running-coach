CREATE TABLE IF NOT EXISTS `coach_memories` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `content` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `coach_memories_user_created` ON `coach_memories` (`user_id`, `created_at`);
