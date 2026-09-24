ALTER TABLE `hg_agent_documents`
	ADD COLUMN `library` text DEFAULT 'personal' NOT NULL
	CHECK (`library` IN ('personal', 'office'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_agent_documents_library`
	ON `hg_agent_documents` (`library`, `updated_at`);
