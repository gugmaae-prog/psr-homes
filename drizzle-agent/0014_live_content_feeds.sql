CREATE TABLE IF NOT EXISTS `hg_project_feed` (
  `slug` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `developer` text NOT NULL,
  `emirate` text NOT NULL,
  `area` text NOT NULL,
  `starting_price` integer DEFAULT 0 NOT NULL,
  `payment_plan` text DEFAULT 'On request' NOT NULL,
  `handover` text DEFAULT 'To be confirmed' NOT NULL,
  `image_url` text DEFAULT '' NOT NULL,
  `bedrooms_json` text DEFAULT '[]' NOT NULL,
  `property_types_json` text DEFAULT '[]' NOT NULL,
  `summary` text DEFAULT '' NOT NULL,
  `source_url` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `source_checked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `discovered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_hg_project_feed_source` ON `hg_project_feed` (`source_url`);
CREATE INDEX IF NOT EXISTS `idx_hg_project_feed_status_discovered` ON `hg_project_feed` (`status`, `discovered_at`);
CREATE INDEX IF NOT EXISTS `idx_hg_project_feed_market` ON `hg_project_feed` (`emirate`, `developer`);

CREATE TABLE IF NOT EXISTS `hg_daily_insights` (
  `slug` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `dek` text NOT NULL,
  `body_json` text DEFAULT '[]' NOT NULL,
  `category` text DEFAULT 'Daily market lens' NOT NULL,
  `source_label` text NOT NULL,
  `source_url` text NOT NULL,
  `source_published_at` text DEFAULT '' NOT NULL,
  `image_url` text DEFAULT '' NOT NULL,
  `market_date` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `published_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_hg_daily_insights_market_date` ON `hg_daily_insights` (`market_date`);
CREATE INDEX IF NOT EXISTS `idx_hg_daily_insights_status_date` ON `hg_daily_insights` (`status`, `market_date`);
