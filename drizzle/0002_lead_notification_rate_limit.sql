CREATE TABLE IF NOT EXISTS `hg_agent_rate_limits` (
  `key` text PRIMARY KEY NOT NULL,
  `window_started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `count` integer DEFAULT 0 NOT NULL
);
