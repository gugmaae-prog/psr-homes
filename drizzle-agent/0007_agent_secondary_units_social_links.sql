ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `whatsapp_phone` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `linkedin_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `instagram_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_secondary_units` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_email` text NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE CASCADE,
  `title` text NOT NULL,
  `community` text NOT NULL,
  `emirate` text DEFAULT 'Dubai' NOT NULL,
  `property_type` text NOT NULL,
  `bedrooms` text NOT NULL,
  `bathrooms` integer DEFAULT 0 NOT NULL,
  `size_sqft` integer DEFAULT 0 NOT NULL,
  `price_aed` integer DEFAULT 0 NOT NULL,
  `reference` text DEFAULT '' NOT NULL,
  `image_url` text DEFAULT '' NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'available' NOT NULL
    CHECK (`status` IN ('available', 'under_offer', 'sold', 'leased')),
  `published` integer DEFAULT 0 NOT NULL
    CHECK (`published` IN (0, 1)),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_secondary_units_owner`
  ON `hg_agent_secondary_units` (`agent_email`, `updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_secondary_units_public`
  ON `hg_agent_secondary_units` (`agent_email`, `published`, `status`);
