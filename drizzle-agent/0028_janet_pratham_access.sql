INSERT INTO `hg_agent_profiles`
  (`email`, `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `team_name`, `access_json`, `created_at`, `updated_at`)
VALUES
  ('janet@psrhomes.ae', 'Janet Genabio', '', 'Office Coordinator', '/api/agent/avatar/janet-genabio', 'agent', 1, 'Operations', '["workspace","inbox","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(`email`) DO UPDATE SET
  `display_name` = excluded.`display_name`,
  `title` = excluded.`title`,
  `avatar_url` = excluded.`avatar_url`,
  `role` = 'agent',
  `active` = 1,
  `team_name` = excluded.`team_name`,
  `access_json` = excluded.`access_json`,
  `updated_at` = CURRENT_TIMESTAMP;

UPDATE `hg_agent_profiles`
SET `display_name` = 'Pratham Raval',
    `title` = 'Property Consultant',
    `avatar_url` = '/api/agent/avatar/pratham-raval',
    `role` = 'agent',
    `active` = 1,
    `team_name` = 'Advisory',
    `access_json` = '["workspace","crm","inbox","research","portfolio","documents"]',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `email` = 'pratham@psrhomes.ae';
