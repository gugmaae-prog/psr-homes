CREATE TABLE IF NOT EXISTS `hg_grace_memories` (
  `session_id` text PRIMARY KEY NOT NULL,
  `lead_id` integer,
  `email` text NOT NULL DEFAULT '',
  `preferences_json` text NOT NULL DEFAULT '{}',
  `behavior_json` text NOT NULL DEFAULT '{}',
  `summary` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `haus_grace_leads`(`id`) ON UPDATE no action ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS `idx_hg_grace_memories_email`
ON `hg_grace_memories` (`email`, `updated_at`);

CREATE TABLE IF NOT EXISTS `hg_client_briefs` (
  `id` text PRIMARY KEY NOT NULL,
  `lead_id` integer,
  `email` text NOT NULL,
  `brief_type` text NOT NULL DEFAULT 'grace_finder',
  `status` text NOT NULL DEFAULT 'generated',
  `project_slugs_json` text NOT NULL DEFAULT '[]',
  `generated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` text NOT NULL DEFAULT '',
  `error_message` text NOT NULL DEFAULT '',
  FOREIGN KEY (`lead_id`) REFERENCES `haus_grace_leads`(`id`) ON UPDATE no action ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS `idx_hg_client_briefs_lead`
ON `hg_client_briefs` (`lead_id`, `generated_at`);

CREATE INDEX IF NOT EXISTS `idx_hg_client_briefs_email`
ON `hg_client_briefs` (`email`, `generated_at`);
