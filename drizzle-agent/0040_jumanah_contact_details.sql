-- Keep Jumanah's public profile, direct actions and advisor presentation on
-- the same verified PSR contact details.
UPDATE `hg_agent_profiles`
SET `phone` = '+971 58 680 1148',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `email` = 'jumanah@psrhomes.ae';

UPDATE `hg_agent_advisor_profiles`
SET `whatsapp_phone` = '+971 58 680 1148',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `agent_email` = 'jumanah@psrhomes.ae';

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
VALUES
  ('migration-0040-jumanah-contact', 'system@psrhomes.ae', 'profile_updated', 'jumanah@psrhomes.ae', '{"phone":"+971 58 680 1148","whatsappPhone":"+971 58 680 1148"}', CURRENT_TIMESTAMP);
