CREATE TABLE IF NOT EXISTS psr_leadrat_lead_syncs (
  website_lead_id INTEGER PRIMARY KEY REFERENCES haus_grace_leads(id) ON DELETE CASCADE,
  leadrat_lead_id TEXT NOT NULL DEFAULT '',
  target_psr_email TEXT NOT NULL,
  target_leadrat_email TEXT NOT NULL DEFAULT '',
  target_leadrat_user_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('synced', 'failed')),
  error_message TEXT NOT NULL DEFAULT '',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_psr_leadrat_lead_syncs_status
  ON psr_leadrat_lead_syncs (status, attempted_at);

CREATE INDEX IF NOT EXISTS idx_psr_leadrat_lead_syncs_target
  ON psr_leadrat_lead_syncs (target_psr_email, target_leadrat_email, attempted_at);
