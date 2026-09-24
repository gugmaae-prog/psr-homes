INSERT INTO `hg_agent_profiles`
  (`email`, `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `created_at`, `updated_at`)
SELECT
  'urvashi@cba.espacios.me',
  'Urvashi',
  `phone`,
  `title`,
  `avatar_url`,
  `role`,
  `active`,
  `created_at`,
  CURRENT_TIMESTAMP
FROM `hg_agent_profiles`
WHERE `email` = 'urvi@cba.espacios.me'
  AND NOT EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

UPDATE `hg_agent_credentials`
SET `email` = 'urvashi@cba.espacios.me',
    `username` = 'urvashi'
WHERE `email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

UPDATE `hg_agent_sessions`
SET `email` = 'urvashi@cba.espacios.me'
WHERE `email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

UPDATE `hg_agent_login_codes`
SET `email` = 'urvashi@cba.espacios.me'
WHERE `email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

UPDATE `hg_agent_conversations`
SET `agent_email` = 'urvashi@cba.espacios.me'
WHERE `agent_email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

UPDATE `hg_agent_documents`
SET `agent_email` = 'urvashi@cba.espacios.me'
WHERE `agent_email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

UPDATE `hg_agent_email_log`
SET `agent_email` = 'urvashi@cba.espacios.me'
WHERE `agent_email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

UPDATE `hg_agent_admin_audit`
SET `target_email` = 'urvashi@cba.espacios.me'
WHERE `target_email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );

DELETE FROM `hg_agent_profiles`
WHERE `email` = 'urvi@cba.espacios.me'
  AND EXISTS (
    SELECT 1 FROM `hg_agent_profiles` WHERE `email` = 'urvashi@cba.espacios.me'
  );
