ALTER TABLE `hg_agent_messages` ADD COLUMN `sources_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `hg_agent_profiles`
SET `display_name` = 'Prateek Rawal', `updated_at` = CURRENT_TIMESTAMP
WHERE `email` = 'pratheek@psrhomes.ae';
