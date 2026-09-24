INSERT INTO `hg_agent_profiles`
  (`email`, `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `team_name`, `access_json`, `created_at`, `updated_at`)
VALUES
  ('jummanah@psrhomes.ae', 'Jummanah', '', 'Managing Partner', '/api/agent/avatar/jummanah', 'agent', 1, 'Leadership', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(`email`) DO UPDATE SET
  `display_name` = excluded.`display_name`,
  `title` = excluded.`title`,
  `avatar_url` = excluded.`avatar_url`,
  `team_name` = excluded.`team_name`,
  `active` = 1,
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `hg_agent_advisor_profiles`
  (`agent_email`, `portfolio_slug`, `portfolio_headline`, `portfolio_bio`, `portfolio_specialties_json`, `onboarding_complete`, `created_at`, `updated_at`)
VALUES
  ('jummanah@psrhomes.ae', 'jummanah', 'Emirati leadership and private client advisory', 'A PSR leader focused on accountable advice, clear client briefs and coordinated transaction support across the UAE property market.', '["Emirati private client advisory","PSR leadership","English","Arabic"]', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(`agent_email`) DO UPDATE SET
  `portfolio_slug` = excluded.`portfolio_slug`,
  `portfolio_headline` = excluded.`portfolio_headline`,
  `portfolio_bio` = excluded.`portfolio_bio`,
  `portfolio_specialties_json` = excluded.`portfolio_specialties_json`,
  `updated_at` = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
VALUES
  ('migration-0033-jummanah-managing-partner', 'system@psrhomes.ae', 'user_created', 'jummanah@psrhomes.ae', '{"title":"Managing Partner","teamName":"Leadership","authorizationRole":"agent","privacyPortrait":true}', CURRENT_TIMESTAMP);
