CREATE TABLE `hg_agent_property_finder_listings` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_email` text NOT NULL,
  `external_id` text NOT NULL,
  `external_url` text NOT NULL,
  `reference` text DEFAULT '' NOT NULL,
  `title` text NOT NULL,
  `location` text NOT NULL,
  `property_type` text NOT NULL,
  `listing_type` text NOT NULL,
  `bedrooms` text DEFAULT '' NOT NULL,
  `bathrooms` integer DEFAULT 0 NOT NULL,
  `size_sqft` integer DEFAULT 0 NOT NULL,
  `price_aed` integer DEFAULT 0 NOT NULL,
  `image_url` text DEFAULT '' NOT NULL,
  `listed_at` text DEFAULT '' NOT NULL,
  `featured` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`agent_email`) REFERENCES `hg_agent_profiles`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_hg_pf_listings_owner_external`
  ON `hg_agent_property_finder_listings` (`agent_email`, `external_id`);
--> statement-breakpoint
CREATE INDEX `idx_hg_pf_listings_owner`
  ON `hg_agent_property_finder_listings` (`agent_email`, `status`, `updated_at`);
--> statement-breakpoint
CREATE TABLE `hg_agent_property_finder_sync` (
  `agent_email` text PRIMARY KEY NOT NULL,
  `profile_url` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `listing_count` integer DEFAULT 0 NOT NULL,
  `total_count` integer DEFAULT 0 NOT NULL,
  `error` text DEFAULT '' NOT NULL,
  `last_attempted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_synced_at` text DEFAULT '' NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`agent_email`) REFERENCES `hg_agent_profiles`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_hg_pf_sync_status`
  ON `hg_agent_property_finder_sync` (`status`, `last_attempted_at`);
--> statement-breakpoint
UPDATE `hg_agent_profiles`
SET `display_name` = 'Mehul Mistry',
    `title` = 'Sales Director',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'mehul@cba.espacios.me';
--> statement-breakpoint
UPDATE `hg_agent_profiles`
SET `display_name` = 'Priya Mistry',
    `title` = 'Chief Executive Officer',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'priya@cba.espacios.me';
--> statement-breakpoint
UPDATE `hg_agent_profiles`
SET `display_name` = 'Irfan Baismail',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'irfan@cba.espacios.me';
--> statement-breakpoint
UPDATE `hg_agent_profiles`
SET `display_name` = 'Urvashi Saraiya',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'urvashi@cba.espacios.me';
--> statement-breakpoint
UPDATE `hg_agent_advisor_profiles`
SET `property_finder_profile_url` = 'https://www.propertyfinder.ae/en/agent/irfan-baismail-371195',
    `property_finder_experience` = 'In UAE real estate since 2017',
    `property_finder_areas_json` = '["Al Furjan","Jebel Ali","Dubai Investment Park","Dubai Land","Damac Lagoons"]',
    `property_finder_verified_at` = '2026-07-27',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`agent_email`) = 'irfan@cba.espacios.me';
