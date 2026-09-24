ALTER TABLE `hg_agent_credentials`
	ADD COLUMN `must_change_password` integer DEFAULT 0 NOT NULL
	CHECK (`must_change_password` IN (0, 1));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_email` text NOT NULL,
	`action` text NOT NULL,
	`target_email` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_admin_audit_target`
	ON `hg_agent_admin_audit` (`target_email`, `created_at`);
