ALTER TABLE `hg_agent_profiles`
	ADD COLUMN `phone` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_profiles`
	ADD COLUMN `title` text DEFAULT 'Property Advisor' NOT NULL;
