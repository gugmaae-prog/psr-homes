-- Versioned, source-linked observations for report-time market evidence.
-- Values are intentionally generic so the same foundation can hold national,
-- emirate, community, and project metrics without changing the schema.
CREATE TABLE IF NOT EXISTS `psr_market_data_sources` (
  `id` text PRIMARY KEY NOT NULL,
  `source_key` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL CHECK (`version` >= 1),
  `publisher` text NOT NULL,
  `label` text NOT NULL,
  `canonical_url` text NOT NULL,
  `source_type` text DEFAULT 'other' NOT NULL
    CHECK (`source_type` IN ('government', 'official', 'developer', 'research', 'brokerage', 'news', 'internal', 'other')),
  `jurisdiction` text DEFAULT 'UAE' NOT NULL,
  `published_at` text DEFAULT '' NOT NULL,
  `checked_at` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL
    CHECK (`status` IN ('active', 'retired', 'withdrawn')),
  `metadata_json` text DEFAULT '{}' NOT NULL CHECK (json_valid(`metadata_json`)),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (`source_key`, `version`),
  CHECK (length(trim(`source_key`)) > 0),
  CHECK (length(trim(`publisher`)) > 0),
  CHECK (length(trim(`label`)) > 0),
  CHECK (length(trim(`canonical_url`)) > 0),
  CHECK (datetime(`checked_at`) IS NOT NULL),
  CHECK (length(`published_at`) = 0 OR datetime(`published_at`) IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_psr_market_sources_key_status`
  ON `psr_market_data_sources` (`source_key`, `status`, `version` DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_psr_market_sources_checked`
  ON `psr_market_data_sources` (`status`, `checked_at` DESC);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `psr_market_observations` (
  `id` text PRIMARY KEY NOT NULL,
  `series_key` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL CHECK (`version` >= 1),
  `metric_key` text NOT NULL,
  `scope_type` text NOT NULL
    CHECK (`scope_type` IN ('uae', 'emirate', 'community', 'project')),
  `scope_key` text NOT NULL,
  `scope_label` text DEFAULT '' NOT NULL,
  `value_numeric` real,
  `value_text` text DEFAULT '' NOT NULL,
  `unit` text NOT NULL,
  `currency_code` text DEFAULT '' NOT NULL,
  `period_start` text DEFAULT '' NOT NULL,
  `period_end` text DEFAULT '' NOT NULL,
  `observed_at` text NOT NULL,
  `published_at` text NOT NULL,
  `valid_from` text NOT NULL,
  `valid_until` text DEFAULT '' NOT NULL,
  `fresh_until` text NOT NULL,
  `recent_until` text NOT NULL,
  `reference_until` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL
    CHECK (`status` IN ('draft', 'published', 'superseded', 'withdrawn')),
  `source_id` text NOT NULL REFERENCES `psr_market_data_sources` (`id`) ON DELETE RESTRICT,
  `source_record_id` text DEFAULT '' NOT NULL,
  `evidence_url` text DEFAULT '' NOT NULL,
  `provenance_note` text DEFAULT '' NOT NULL,
  `methodology` text DEFAULT '' NOT NULL,
  `metadata_json` text DEFAULT '{}' NOT NULL CHECK (json_valid(`metadata_json`)),
  `ingested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (`series_key`, `version`),
  CHECK (length(trim(`series_key`)) > 0),
  CHECK (length(trim(`metric_key`)) > 0),
  CHECK (length(trim(`scope_key`)) > 0),
  CHECK (`value_numeric` IS NOT NULL OR length(trim(`value_text`)) > 0),
  CHECK (length(trim(`unit`)) > 0),
  CHECK (length(`currency_code`) = 0 OR length(`currency_code`) = 3),
  CHECK (length(`period_start`) = 0 OR datetime(`period_start`) IS NOT NULL),
  CHECK (length(`period_end`) = 0 OR datetime(`period_end`) IS NOT NULL),
  CHECK (length(`period_start`) = 0 OR length(`period_end`) = 0 OR datetime(`period_end`) >= datetime(`period_start`)),
  CHECK (datetime(`observed_at`) IS NOT NULL),
  CHECK (datetime(`published_at`) IS NOT NULL),
  CHECK (datetime(`valid_from`) IS NOT NULL),
  CHECK (length(`valid_until`) = 0 OR datetime(`valid_until`) IS NOT NULL),
  CHECK (length(`valid_until`) = 0 OR datetime(`valid_until`) > datetime(`valid_from`)),
  CHECK (datetime(`fresh_until`) IS NOT NULL),
  CHECK (datetime(`recent_until`) IS NOT NULL),
  CHECK (datetime(`reference_until`) IS NOT NULL),
  CHECK (datetime(`recent_until`) >= datetime(`fresh_until`)),
  CHECK (datetime(`reference_until`) >= datetime(`recent_until`))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_psr_market_observations_published_scope`
  ON `psr_market_observations`
    (`scope_type`, `scope_key`, `metric_key`, `observed_at` DESC, `version` DESC)
  WHERE `status` = 'published';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_psr_market_observations_source`
  ON `psr_market_observations` (`source_id`, `observed_at` DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_psr_market_observations_validity`
  ON `psr_market_observations`
    (`status`, `valid_until`, `fresh_until`, `recent_until`, `reference_until`);
