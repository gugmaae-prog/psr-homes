-- Align the live account with the company address already used by PSR's
-- public roster, Email Routing rules, and Email Sending allowlist.
INSERT OR IGNORE INTO `hg_agent_profiles`
  (`email`, `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `team_name`, `access_json`, `avatar_r2_key`, `photo_updated_at`, `created_at`, `updated_at`)
SELECT
  'pratheek@psrhomes.ae', `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `team_name`, `access_json`, `avatar_r2_key`, `photo_updated_at`, `created_at`, CURRENT_TIMESTAMP
FROM `hg_agent_profiles`
WHERE `email` = 'prateek@psrhomes.ae';

UPDATE `hg_agent_credentials`
SET `email` = 'pratheek@psrhomes.ae',
    `username` = CASE WHEN lower(`username`) = 'prateek' THEN 'pratheek' ELSE `username` END
WHERE `email` = 'prateek@psrhomes.ae';

DELETE FROM `hg_agent_sessions`
WHERE `email` IN ('prateek@psrhomes.ae', 'pratheek@psrhomes.ae');
DELETE FROM `hg_agent_login_codes`
WHERE `email` IN ('prateek@psrhomes.ae', 'pratheek@psrhomes.ae');

UPDATE `hg_agent_advisor_profiles` SET `agent_email` = 'pratheek@psrhomes.ae' WHERE `agent_email` = 'prateek@psrhomes.ae';
UPDATE `hg_agent_secondary_units` SET `agent_email` = 'pratheek@psrhomes.ae' WHERE `agent_email` = 'prateek@psrhomes.ae';
UPDATE `hg_agent_property_finder_listings` SET `agent_email` = 'pratheek@psrhomes.ae' WHERE `agent_email` = 'prateek@psrhomes.ae';
UPDATE `hg_agent_property_finder_sync` SET `agent_email` = 'pratheek@psrhomes.ae' WHERE `agent_email` = 'prateek@psrhomes.ae';
UPDATE `hg_agent_conversations` SET `agent_email` = 'pratheek@psrhomes.ae' WHERE `agent_email` = 'prateek@psrhomes.ae';
UPDATE `hg_agent_documents` SET `agent_email` = 'pratheek@psrhomes.ae' WHERE `agent_email` = 'prateek@psrhomes.ae';
UPDATE `hg_agent_documents`
SET `content_json` = json_set(`content_json`, '$.advisor.email', 'pratheek@psrhomes.ae'),
    `updated_at` = CURRENT_TIMESTAMP
WHERE `agent_email` = 'pratheek@psrhomes.ae'
  AND `status` = 'draft'
  AND json_valid(`content_json`)
  AND json_extract(`content_json`, '$.advisor.email') = 'prateek@psrhomes.ae';
UPDATE `hg_agent_email_log` SET `agent_email` = 'pratheek@psrhomes.ae' WHERE `agent_email` = 'prateek@psrhomes.ae';

UPDATE `hg_crm_contacts` SET `owner_email` = 'pratheek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'prateek@psrhomes.ae';
UPDATE `hg_crm_opportunities` SET `owner_email` = 'pratheek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'prateek@psrhomes.ae';
UPDATE `hg_crm_tasks` SET `owner_email` = 'pratheek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'prateek@psrhomes.ae';
UPDATE `hg_crm_activities` SET `owner_email` = 'pratheek@psrhomes.ae' WHERE `owner_email` = 'prateek@psrhomes.ae';
UPDATE `hg_crm_audit_log` SET `owner_email` = 'pratheek@psrhomes.ae' WHERE `owner_email` = 'prateek@psrhomes.ae';
UPDATE `hg_crm_campaign_events` SET `owner_email` = 'pratheek@psrhomes.ae' WHERE `owner_email` = 'prateek@psrhomes.ae';
UPDATE `psr_inbox_messages` SET `mailbox` = 'pratheek@psrhomes.ae' WHERE `mailbox` = 'prateek@psrhomes.ae';
UPDATE `hg_agent_admin_audit` SET `target_email` = 'pratheek@psrhomes.ae' WHERE `target_email` = 'prateek@psrhomes.ae';

DELETE FROM `hg_agent_profiles`
WHERE `email` = 'prateek@psrhomes.ae' AND `role` <> 'admin';

UPDATE `hg_agent_profiles`
SET `display_name` = 'Prateek Rawal',
    `title` = 'Managing Partner',
    `avatar_url` = '/api/agent/avatar/pratheek-rawal',
    `role` = 'agent',
    `active` = 1,
    `team_name` = 'Leadership',
    `access_json` = '["workspace","crm","inbox","research","portfolio","documents"]',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `email` = 'pratheek@psrhomes.ae';

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
VALUES
  ('migration-0030-pratheek-email', 'system@psrhomes.ae', 'email_renamed', 'pratheek@psrhomes.ae', '{"previousEmail":"prateek@psrhomes.ae","newEmail":"pratheek@psrhomes.ae","sessionsRevoked":true}', CURRENT_TIMESTAMP);
