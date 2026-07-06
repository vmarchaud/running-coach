CREATE TABLE IF NOT EXISTS `nolio_tokens` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `users`(`id`),
  `access_token` text NOT NULL,
  `refresh_token` text NOT NULL,
  `nolio_user_id` text,
  `nolio_first_name` text,
  `nolio_last_name` text,
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
