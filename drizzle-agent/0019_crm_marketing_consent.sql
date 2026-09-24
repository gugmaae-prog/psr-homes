ALTER TABLE `hg_crm_contacts` ADD COLUMN `consent_recorded_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_crm_contacts` ADD COLUMN `consent_source` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_crm_contacts` ADD COLUMN `consent_detail` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `hg_crm_contacts`
SET `consent_recorded_at` = COALESCE(NULLIF(`created_at`, ''), CURRENT_TIMESTAMP),
    `consent_source` = `source`,
    `consent_detail` = 'Explicit consent captured by a PSR website form.'
WHERE `consent_status` = 'granted'
  AND `source` LIKE 'website:%'
  AND `consent_recorded_at` = '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_contacts_campaign_audience`
  ON `hg_crm_contacts` (`owner_email`, `consent_status`, `status`, `updated_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hg_crm_campaign_events` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `owner_email` text NOT NULL,
  `actor_email` text NOT NULL,
  `action` text NOT NULL
    CHECK (`action` IN ('created', 'test_sent', 'send_accepted', 'send_failed')),
  `metadata_json` text DEFAULT '{}' NOT NULL CHECK (json_valid(`metadata_json`)),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_campaign_events_owner_created`
  ON `hg_crm_campaign_events` (`owner_email`, `created_at`);
