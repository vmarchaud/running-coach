ALTER TABLE `users` ADD COLUMN `last_checkin_at` text;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `push_subscriptions_user` ON `push_subscriptions` (`user_id`);
