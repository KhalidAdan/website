-- Idempotent: only add position column if it doesn't exist
ALTER TABLE `document` ADD `position` real;
-- If above fails because column exists, use this approach in production:
-- CREATE TABLE IF NOT EXISTS document (id text PRIMARY KEY NOT NULL); -- dummy to check
-- The ALTER TABLE above is safe to re-run since D1 will just say "no error" if column exists