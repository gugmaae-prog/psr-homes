-- Correct Prateek Rawal's canonical PSR identity while preserving all private
-- workspace data, mailbox history, public-profile settings, and the password.
INSERT OR IGNORE INTO `hg_agent_profiles`
  (`email`, `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `team_name`, `access_json`, `avatar_r2_key`, `photo_updated_at`, `created_at`, `updated_at`)
SELECT
  'prateek@psrhomes.ae', `display_name`, `phone`, `title`, '/api/agent/avatar/prateek-rawal', `role`, `active`, `team_name`, `access_json`, `avatar_r2_key`, `photo_updated_at`, `created_at`, CURRENT_TIMESTAMP
FROM `hg_agent_profiles`
WHERE `email` = 'pratheek@psrhomes.ae';

UPDATE `hg_agent_credentials`
SET `email` = 'prateek@psrhomes.ae',
    `username` = 'prateek'
WHERE `email` = 'pratheek@psrhomes.ae';

DELETE FROM `hg_agent_sessions`
WHERE `email` IN ('pratheek@psrhomes.ae', 'prateek@psrhomes.ae');
DELETE FROM `hg_agent_login_codes`
WHERE `email` IN ('pratheek@psrhomes.ae', 'prateek@psrhomes.ae');

UPDATE `hg_agent_advisor_profiles` SET `agent_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_secondary_units` SET `agent_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_property_finder_listings` SET `agent_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_property_finder_sync` SET `agent_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_conversations` SET `agent_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_documents` SET `agent_email` = 'prateek@psrhomes.ae' WHERE `agent_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_documents`
SET `content_json` = json_set(`content_json`, '$.advisor.email', 'prateek@psrhomes.ae'),
    `updated_at` = CURRENT_TIMESTAMP
WHERE `agent_email` = 'prateek@psrhomes.ae'
  AND `status` = 'draft'
  AND json_valid(`content_json`)
  AND json_extract(`content_json`, '$.advisor.email') = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_email_log` SET `agent_email` = 'prateek@psrhomes.ae' WHERE `agent_email` = 'pratheek@psrhomes.ae';

UPDATE `hg_crm_contacts` SET `owner_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_opportunities` SET `owner_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_tasks` SET `owner_email` = 'prateek@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_activities` SET `owner_email` = 'prateek@psrhomes.ae' WHERE `owner_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_activities` SET `actor_email` = 'prateek@psrhomes.ae' WHERE `actor_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_audit_log` SET `owner_email` = 'prateek@psrhomes.ae' WHERE `owner_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_audit_log` SET `actor_email` = 'prateek@psrhomes.ae' WHERE `actor_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_campaign_events` SET `owner_email` = 'prateek@psrhomes.ae' WHERE `owner_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_crm_campaign_events` SET `actor_email` = 'prateek@psrhomes.ae' WHERE `actor_email` = 'pratheek@psrhomes.ae';
UPDATE `psr_inbox_messages` SET `mailbox` = 'prateek@psrhomes.ae' WHERE `mailbox` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_admin_audit` SET `target_email` = 'prateek@psrhomes.ae' WHERE `target_email` = 'pratheek@psrhomes.ae';
UPDATE `hg_agent_admin_audit` SET `admin_email` = 'prateek@psrhomes.ae' WHERE `admin_email` = 'pratheek@psrhomes.ae';

DELETE FROM `hg_agent_profiles`
WHERE `email` = 'pratheek@psrhomes.ae' AND `role` <> 'admin';

UPDATE `hg_agent_profiles`
SET `display_name` = 'Prateek Rawal',
    `title` = 'Managing Partner',
    `avatar_url` = '/api/agent/avatar/prateek-rawal',
    `team_name` = 'Leadership',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `email` = 'prateek@psrhomes.ae';

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
VALUES
  ('migration-0035-prateek-identity', 'system@psrhomes.ae', 'email_renamed', 'prateek@psrhomes.ae', '{"previousEmail":"pratheek@psrhomes.ae","newEmail":"prateek@psrhomes.ae","username":"prateek","sessionsRevoked":true}', CURRENT_TIMESTAMP);
