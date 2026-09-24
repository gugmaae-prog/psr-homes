CREATE TABLE IF NOT EXISTS `hg_agent_credentials` (
	`email` text PRIMARY KEY NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE CASCADE,
	`username` text NOT NULL COLLATE NOCASE,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`password_changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_login_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_hg_agent_credentials_username`
	ON `hg_agent_credentials` (`username` COLLATE NOCASE);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_credentials_locked`
	ON `hg_agent_credentials` (`locked_until`);
