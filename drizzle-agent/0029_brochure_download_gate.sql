CREATE TABLE IF NOT EXISTS `psr_brochure_downloads` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `lead_id` integer NOT NULL,
  `project_slug` text NOT NULL,
  `expires_at` text NOT NULL,
  `downloaded_at` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`lead_id`) REFERENCES `haus_grace_leads` (`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_psr_brochure_download_expiry`
  ON `psr_brochure_downloads` (`expires_at`);

CREATE INDEX IF NOT EXISTS `idx_psr_brochure_download_project`
  ON `psr_brochure_downloads` (`project_slug`, `created_at`);
