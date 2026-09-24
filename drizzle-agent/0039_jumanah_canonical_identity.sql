-- Correct Jumanah's canonical PSR identity while preserving her existing
-- portal profile, credentials, documents, CRM ownership, inbox and media.
INSERT OR IGNORE INTO `hg_agent_profiles`
  (`email`, `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `team_name`, `access_json`, `avatar_r2_key`, `photo_updated_at`, `created_at`, `updated_at`)
SELECT
  'jumanah@psrhomes.ae', 'Jumanah', `phone`, `title`, '/api/agent/avatar/jumanah', `role`, `active`, `team_name`, `access_json`, `avatar_r2_key`, `photo_updated_at`, `created_at`, CURRENT_TIMESTAMP
FROM `hg_agent_profiles`
WHERE `email` = 'jummanah@psrhomes.ae';

UPDATE `hg_agent_credentials`
SET `email` = 'jumanah@psrhomes.ae',
    `username` = CASE WHEN lower(`username`) IN ('jummanah', 'jumanah') THEN 'jumanah' ELSE `username` END
WHERE `email` = 'jummanah@psrhomes.ae';

DELETE FROM `hg_agent_sessions`
WHERE `email` IN ('jummanah@psrhomes.ae', 'jumanah@psrhomes.ae');
DELETE FROM `hg_agent_login_codes`
WHERE `email` IN ('jummanah@psrhomes.ae', 'jumanah@psrhomes.ae');

UPDATE `hg_agent_advisor_profiles`
SET `agent_email` = 'jumanah@psrhomes.ae',
    `portfolio_slug` = 'jumanah',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `agent_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_secondary_units` SET `agent_email` = 'jumanah@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_property_finder_listings` SET `agent_email` = 'jumanah@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_property_finder_sync` SET `agent_email` = 'jumanah@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_conversations` SET `agent_email` = 'jumanah@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `agent_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_documents` SET `agent_email` = 'jumanah@psrhomes.ae' WHERE `agent_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_documents`
SET `content_json` = json_set(`content_json`, '$.advisor.email', 'jumanah@psrhomes.ae'),
    `updated_at` = CURRENT_TIMESTAMP
WHERE `agent_email` = 'jumanah@psrhomes.ae'
  AND json_valid(`content_json`)
  AND json_extract(`content_json`, '$.advisor.email') = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_email_log` SET `agent_email` = 'jumanah@psrhomes.ae' WHERE `agent_email` = 'jummanah@psrhomes.ae';

UPDATE `hg_crm_contacts` SET `owner_email` = 'jumanah@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_opportunities` SET `owner_email` = 'jumanah@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_tasks` SET `owner_email` = 'jumanah@psrhomes.ae', `updated_at` = CURRENT_TIMESTAMP WHERE `owner_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_activities` SET `owner_email` = 'jumanah@psrhomes.ae' WHERE `owner_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_activities` SET `actor_email` = 'jumanah@psrhomes.ae' WHERE `actor_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_audit_log` SET `owner_email` = 'jumanah@psrhomes.ae' WHERE `owner_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_audit_log` SET `actor_email` = 'jumanah@psrhomes.ae' WHERE `actor_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_campaign_events` SET `owner_email` = 'jumanah@psrhomes.ae' WHERE `owner_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_crm_campaign_events` SET `actor_email` = 'jumanah@psrhomes.ae' WHERE `actor_email` = 'jummanah@psrhomes.ae';
UPDATE `psr_inbox_messages` SET `mailbox` = 'jumanah@psrhomes.ae' WHERE `mailbox` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_admin_audit` SET `target_email` = 'jumanah@psrhomes.ae' WHERE `target_email` = 'jummanah@psrhomes.ae';
UPDATE `hg_agent_admin_audit` SET `admin_email` = 'jumanah@psrhomes.ae' WHERE `admin_email` = 'jummanah@psrhomes.ae';

DELETE FROM `hg_agent_profiles`
WHERE `email` = 'jummanah@psrhomes.ae' AND `role` <> 'admin';

UPDATE `hg_agent_profiles`
SET `display_name` = 'Jumanah',
    `title` = 'Managing Partner',
    `avatar_url` = '/api/agent/avatar/jumanah',
    `team_name` = 'Leadership',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `email` = 'jumanah@psrhomes.ae';

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
VALUES
  ('migration-0039-jumanah-identity', 'system@psrhomes.ae', 'email_renamed', 'jumanah@psrhomes.ae', '{"previousEmail":"jummanah@psrhomes.ae","newEmail":"jumanah@psrhomes.ae","username":"jumanah","portfolioSlug":"jumanah","sessionsRevoked":true}', CURRENT_TIMESTAMP);
