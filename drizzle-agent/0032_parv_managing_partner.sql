-- Keep authorization role and access unchanged while correcting Parv's
-- business title and grouping across authenticated staff surfaces.
UPDATE `hg_agent_profiles`
SET `title` = 'Managing Partner',
    `team_name` = 'Leadership',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'parv@psrhomes.ae';

-- Correct only editable drafts that still carry the previous title. Published
-- or historical documents remain unchanged.
UPDATE `hg_agent_documents`
SET `content_json` = json_set(`content_json`, '$.advisor.title', 'Managing Partner'),
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`agent_email`) = 'parv@psrhomes.ae'
  AND `status` = 'draft'
  AND json_valid(`content_json`)
  AND json_extract(`content_json`, '$.advisor.title') = 'Property Consultant';

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
SELECT
  'migration-0032-parv-managing-partner',
  'system@psrhomes.ae',
  'profile_updated',
  'parv@psrhomes.ae',
  '{"title":"Managing Partner","teamName":"Leadership","authorizationRole":"agent"}',
  CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1 FROM `hg_agent_profiles` WHERE lower(`email`) = 'parv@psrhomes.ae'
);
