ALTER TABLE `hg_agent_profiles` ADD COLUMN `team_name` text NOT NULL DEFAULT 'Advisory';
ALTER TABLE `hg_agent_profiles` ADD COLUMN `access_json` text NOT NULL DEFAULT '["workspace","crm","inbox","research","portfolio","documents"]';
ALTER TABLE `hg_agent_profiles` ADD COLUMN `avatar_r2_key` text NOT NULL DEFAULT '';
ALTER TABLE `hg_agent_profiles` ADD COLUMN `photo_updated_at` text NOT NULL DEFAULT '';

INSERT INTO `hg_agent_profiles`
  (`email`, `display_name`, `phone`, `title`, `avatar_url`, `role`, `active`, `team_name`, `access_json`, `created_at`, `updated_at`)
VALUES
  ('sourabh@psrhomes.ae', 'Sourabh Das', '', 'Property Consultant', '/api/agent/avatar/sourabh-das', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('majhar@psrhomes.ae', 'Majhar Khan', '', 'Property Consultant', '/api/agent/avatar/majhar-khan', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('louay@psrhomes.ae', 'Louay Betengane', '', 'Property Consultant', '/api/agent/avatar/louay-betengane', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rohit@psrhomes.ae', 'Rohit Kumar Sinha', '', 'Property Consultant', '/api/agent/avatar/rohit-kumar-sinha', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('parv@psrhomes.ae', 'Parv Sondhi', '', 'Property Consultant', '/api/agent/avatar/parv-sondhi', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('adhiyaman@psrhomes.ae', 'Adhiyaman Aathimulam', '', 'Property Consultant', '/api/agent/avatar/adhiyaman-aathimulam', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sonu@psrhomes.ae', 'Sonu Sharma', '', 'Managing Director', '/api/agent/avatar/sonu-sharma', 'agent', 1, 'Leadership', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pratheek@psrhomes.ae', 'Prateek Rawal', '', 'Managing Partner', '/api/agent/avatar/pratheek-rawal', 'agent', 1, 'Leadership', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reegan@psrhomes.ae', 'Reegan Negi', '', 'Managing Partner', '/api/agent/avatar/reegan-negi', 'agent', 1, 'Leadership', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pratham@psrhomes.ae', 'Pratham Raval', '', 'Property Consultant', '/api/agent/avatar/pratham-raval', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ujwal@psrhomes.ae', 'Ujwal Kumar', '', 'Property Consultant', '/api/agent/avatar/ujwal-kumar', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('harna@psrhomes.ae', 'Harna Raval', '', 'Property Consultant', '/api/agent/avatar/harna-raval', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(`email`) DO UPDATE SET
  `display_name` = excluded.`display_name`,
  `title` = excluded.`title`,
  `avatar_url` = excluded.`avatar_url`,
  `team_name` = excluded.`team_name`,
  `access_json` = excluded.`access_json`,
  `active` = 1,
  `updated_at` = CURRENT_TIMESTAMP;
