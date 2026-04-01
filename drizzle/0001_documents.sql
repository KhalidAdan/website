CREATE TABLE IF NOT EXISTS `document` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `parent_id` text REFERENCES `document`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `content` text DEFAULT '',
  `is_folder` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX `document_user_id_idx` ON `document` (`user_id`);
CREATE INDEX `document_parent_id_idx` ON `document` (`parent_id`);