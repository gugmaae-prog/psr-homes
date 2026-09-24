CREATE TABLE IF NOT EXISTS `hg_agent_secondary_unit_media` (
  `id` text PRIMARY KEY NOT NULL,
  `unit_id` text NOT NULL REFERENCES `hg_agent_secondary_units` (`id`) ON DELETE CASCADE,
  `r2_key` text NOT NULL UNIQUE,
  `original_filename` text DEFAULT '' NOT NULL,
  `mime_type` text DEFAULT 'image/webp' NOT NULL,
  `size_bytes` integer DEFAULT 0 NOT NULL,
  `width` integer DEFAULT 0 NOT NULL,
  `height` integer DEFAULT 0 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_secondary_unit_media_unit`
  ON `hg_agent_secondary_unit_media` (`unit_id`, `sort_order`, `created_at`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_hg_agent_secondary_unit_media_limit`
BEFORE INSERT ON `hg_agent_secondary_unit_media`
WHEN (SELECT COUNT(*) FROM `hg_agent_secondary_unit_media` WHERE `unit_id` = NEW.`unit_id`) >= 12
BEGIN
  SELECT RAISE(ABORT, 'A listing can store no more than 12 photos.');
END;
