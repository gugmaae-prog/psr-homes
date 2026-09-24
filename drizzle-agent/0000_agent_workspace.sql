CREATE TABLE IF NOT EXISTS `hg_agent_profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'agent' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL CHECK (`active` IN (0, 1)),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_login_codes` (
	`email` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE CASCADE,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_sessions_email`
	ON `hg_agent_sessions` (`email`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_sessions_expires`
	ON `hg_agent_sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_email` text NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE CASCADE,
	`title` text NOT NULL,
	`mode` text DEFAULT 'advisory' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_conversations_owner`
	ON `hg_agent_conversations` (`agent_email`, `updated_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL REFERENCES `hg_agent_conversations` (`id`) ON DELETE CASCADE,
	`role` text NOT NULL CHECK (`role` IN ('user', 'assistant', 'system')),
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_messages_conversation`
	ON `hg_agent_messages` (`conversation_id`, `created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_email` text NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE CASCADE,
	`type` text NOT NULL CHECK (`type` IN ('sales_offer', 'proposal', 'comparison')),
	`title` text NOT NULL,
	`client_name` text NOT NULL,
	`content_json` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft', 'sent', 'archived')),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_documents_owner`
	ON `hg_agent_documents` (`agent_email`, `updated_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `hg_agent_email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL REFERENCES `hg_agent_documents` (`id`) ON DELETE CASCADE,
	`agent_email` text NOT NULL,
	`recipient_email` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL CHECK (`status` IN ('sent', 'failed')),
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_email_log_document`
	ON `hg_agent_email_log` (`document_id`, `created_at`);
