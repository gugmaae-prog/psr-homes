ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `custom_projects_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `property_finder_profile_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `property_finder_brn` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `property_finder_experience` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `property_finder_languages_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `property_finder_areas_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hg_agent_advisor_profiles`
  ADD COLUMN `property_finder_verified_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint

INSERT OR IGNORE INTO `hg_agent_advisor_profiles`
  (`agent_email`, `portfolio_slug`, `onboarding_complete`)
SELECT
  `email`,
  lower(replace(replace(substr(`email`, 1, instr(`email`, '@') - 1), '.', '-'), '_', '-')),
  CASE WHEN `role` = 'admin' OR lower(`email`) = 'info@cba.espacios.me' THEN 1 ELSE 0 END
FROM `hg_agent_profiles`;
--> statement-breakpoint

UPDATE `hg_agent_profiles`
SET `display_name` = 'Vinay Bhat',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'vinay@cba.espacios.me';
--> statement-breakpoint

UPDATE `hg_agent_advisor_profiles`
SET `property_finder_profile_url` = 'https://www.propertyfinder.ae/en/agent/mehulkumar-mistry-269366',
    `property_finder_brn` = '47327',
    `property_finder_experience` = 'In UAE real estate since 2011',
    `property_finder_languages_json` = '["English","Hindi","Gujarati"]',
    `property_finder_areas_json` = '["Zabeel","Al Furjan","Umm Al Quwain Marina"]',
    `property_finder_verified_at` = '2026-07-27'
WHERE lower(`agent_email`) = 'mehul@cba.espacios.me';
--> statement-breakpoint

UPDATE `hg_agent_advisor_profiles`
SET `property_finder_profile_url` = 'https://www.propertyfinder.ae/en/agent/priya-mistry-247810',
    `property_finder_brn` = '53727',
    `property_finder_experience` = 'In real estate since 2008',
    `property_finder_languages_json` = '["English","Hindi","Gujarati"]',
    `property_finder_areas_json` = '["Al Furjan","Al Hamra Village","Al Marjan Island"]',
    `property_finder_verified_at` = '2026-07-27'
WHERE lower(`agent_email`) = 'priya@cba.espacios.me';
--> statement-breakpoint

UPDATE `hg_agent_advisor_profiles`
SET `property_finder_profile_url` = 'https://www.propertyfinder.ae/en/agent/urvashi-saraiya-328752',
    `property_finder_brn` = '87462',
    `property_finder_experience` = 'Property Finder experience record since 2021',
    `property_finder_languages_json` = '["English","Hindi","Gujarati"]',
    `property_finder_areas_json` = '["Al Raudah","Al Hamra Village","Al Marjan Island"]',
    `property_finder_verified_at` = '2026-07-27'
WHERE lower(`agent_email`) = 'urvashi@cba.espacios.me';
--> statement-breakpoint

UPDATE `hg_agent_advisor_profiles`
SET `property_finder_profile_url` = 'https://www.propertyfinder.ae/en/broker/hausgrace-properties-7582',
    `property_finder_brn` = '95152',
    `property_finder_experience` = '10 years of experience',
    `property_finder_languages_json` = '["English","Hindi"]',
    `property_finder_areas_json` = '["Downtown Jebel Ali","Al Furjan","Dubai Investment Park"]',
    `property_finder_verified_at` = '2026-07-27'
WHERE lower(`agent_email`) = 'irfan@cba.espacios.me';
