-- Migrate the temporary staff domain to PSR's canonical company domain while
-- preserving any account history already attached to an agent email. Migration
-- 0023 creates the canonical parent rows first, so dependent records can move
-- without disabling foreign-key enforcement or colliding on the profile key.
INSERT INTO hg_agent_profiles (
  email, display_name, phone, title, avatar_url, role, active, team_name,
  access_json, avatar_r2_key, photo_updated_at, created_at, updated_at
)
SELECT
  replace(email, '@psrproperties.ae', '@psrhomes.ae'), display_name, phone,
  title, avatar_url, role, active, team_name, access_json, avatar_r2_key,
  photo_updated_at, created_at, CURRENT_TIMESTAMP
FROM hg_agent_profiles
WHERE email LIKE '%@psrproperties.ae'
ON CONFLICT(email) DO UPDATE SET
  display_name = excluded.display_name,
  title = excluded.title,
  avatar_url = excluded.avatar_url,
  role = excluded.role,
  active = excluded.active,
  team_name = excluded.team_name,
  access_json = excluded.access_json,
  avatar_r2_key = CASE
    WHEN excluded.avatar_r2_key <> '' THEN excluded.avatar_r2_key
    ELSE hg_agent_profiles.avatar_r2_key
  END,
  photo_updated_at = CASE
    WHEN excluded.photo_updated_at <> '' THEN excluded.photo_updated_at
    ELSE hg_agent_profiles.photo_updated_at
  END,
  updated_at = CURRENT_TIMESTAMP;

UPDATE hg_agent_credentials SET email = replace(email, '@psrproperties.ae', '@psrhomes.ae')
WHERE email LIKE '%@psrproperties.ae';
UPDATE hg_agent_sessions SET email = replace(email, '@psrproperties.ae', '@psrhomes.ae')
WHERE email LIKE '%@psrproperties.ae';
UPDATE hg_agent_documents SET agent_email = replace(agent_email, '@psrproperties.ae', '@psrhomes.ae')
WHERE agent_email LIKE '%@psrproperties.ae';
UPDATE hg_agent_advisor_profiles SET agent_email = replace(agent_email, '@psrproperties.ae', '@psrhomes.ae')
WHERE agent_email LIKE '%@psrproperties.ae';
UPDATE psr_inbox_messages SET mailbox = replace(mailbox, '@psrproperties.ae', '@psrhomes.ae')
WHERE mailbox LIKE '%@psrproperties.ae';

DELETE FROM hg_agent_profiles WHERE email LIKE '%@psrproperties.ae';
