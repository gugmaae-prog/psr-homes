UPDATE `hg_agent_profiles`
SET
  `display_name` = 'Jumanah',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `email` = 'jummanah@psrhomes.ae';

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
VALUES
  ('migration-0034-jumanah-display-name', 'system@psrhomes.ae', 'user_updated', 'jummanah@psrhomes.ae', '{"displayName":"Jumanah","stableIdentifiersPreserved":true}', CURRENT_TIMESTAMP);
