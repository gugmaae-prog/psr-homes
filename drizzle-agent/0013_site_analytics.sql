CREATE TABLE IF NOT EXISTS `hg_site_analytics_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `session_id` text NOT NULL,
  `visitor_id` text NOT NULL,
  `event_type` text NOT NULL,
  `path` text NOT NULL,
  `section` text NOT NULL DEFAULT '',
  `target` text NOT NULL DEFAULT '',
  `x_pct` real,
  `y_pct` real,
  `scroll_depth` integer NOT NULL DEFAULT 0,
  `viewport_width` integer NOT NULL DEFAULT 0,
  `viewport_height` integer NOT NULL DEFAULT 0,
  `device_type` text NOT NULL DEFAULT 'unknown',
  `referrer_host` text NOT NULL DEFAULT '',
  `country` text NOT NULL DEFAULT '',
  `duration_seconds` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_hg_analytics_created`
ON `hg_site_analytics_events` (`created_at`);

CREATE INDEX IF NOT EXISTS `idx_hg_analytics_path_type`
ON `hg_site_analytics_events` (`path`, `event_type`, `created_at`);

CREATE INDEX IF NOT EXISTS `idx_hg_analytics_session`
ON `hg_site_analytics_events` (`session_id`, `created_at`);
