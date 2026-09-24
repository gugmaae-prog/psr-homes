CREATE TABLE IF NOT EXISTS psr_leadrat_user_mappings (
  psr_email TEXT PRIMARY KEY,
  leadrat_email TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_psr_leadrat_user_mappings_target
  ON psr_leadrat_user_mappings (leadrat_email, active);

INSERT INTO psr_leadrat_user_mappings (psr_email, leadrat_email, note, active)
VALUES
  (
    'admin@psrhomes.ae',
    'admin@psrhomes.ae',
    'PSR administrator workspace resolves to the LeadRat admin user.',
    1
  ),
  (
    'prateek@psrhomes.ae',
    'admin@psrhomes.ae',
    'Prateek PSR workspace is synced to the LeadRat admin user so generated/assigned LeadRat leads remain visible in Prateek and admin workspaces.',
    1
  )
ON CONFLICT(psr_email) DO UPDATE SET
  leadrat_email = excluded.leadrat_email,
  note = excluded.note,
  active = excluded.active,
  updated_at = CURRENT_TIMESTAMP;
