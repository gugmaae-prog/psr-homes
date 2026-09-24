CREATE TABLE IF NOT EXISTS hg_agent_advisor_profiles (
  agent_email TEXT PRIMARY KEY NOT NULL REFERENCES hg_agent_profiles(email) ON DELETE CASCADE,
  top_developers_json TEXT NOT NULL DEFAULT '[]',
  top_projects_json TEXT NOT NULL DEFAULT '[]',
  ai_headline TEXT NOT NULL DEFAULT '',
  ai_bio TEXT NOT NULL DEFAULT '',
  ai_specialties_json TEXT NOT NULL DEFAULT '[]',
  ai_recommendations_json TEXT NOT NULL DEFAULT '[]',
  portfolio_headline TEXT NOT NULL DEFAULT '',
  portfolio_bio TEXT NOT NULL DEFAULT '',
  portfolio_specialties_json TEXT NOT NULL DEFAULT '[]',
  portfolio_recommendations_json TEXT NOT NULL DEFAULT '[]',
  portfolio_public INTEGER NOT NULL DEFAULT 0 CHECK (portfolio_public IN (0, 1)),
  portfolio_slug TEXT NOT NULL UNIQUE,
  onboarding_complete INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_complete IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hg_agent_advisor_profiles_public
  ON hg_agent_advisor_profiles (portfolio_public, portfolio_slug);

INSERT OR IGNORE INTO hg_agent_advisor_profiles (agent_email, portfolio_slug, onboarding_complete)
SELECT
  email,
  lower(replace(replace(substr(email, 1, instr(email, '@') - 1), '.', '-'), '_', '-')),
  CASE WHEN role = 'admin' OR email = 'info@cba.espacios.me' THEN 1 ELSE 0 END
FROM hg_agent_profiles;
