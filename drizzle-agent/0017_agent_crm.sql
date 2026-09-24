CREATE TABLE IF NOT EXISTS `hg_crm_contacts` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_email` text NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE RESTRICT,
  `created_by` text NOT NULL,
  `full_name` text NOT NULL,
  `email` text DEFAULT '' NOT NULL,
  `phone` text DEFAULT '' NOT NULL,
  `nationality` text DEFAULT '' NOT NULL,
  `preferred_language` text DEFAULT '' NOT NULL,
  `client_type` text DEFAULT 'buyer' NOT NULL
    CHECK (`client_type` IN ('buyer', 'seller', 'investor', 'tenant', 'landlord', 'other')),
  `source` text DEFAULT 'manual' NOT NULL,
  `status` text DEFAULT 'new' NOT NULL
    CHECK (`status` IN ('new', 'qualified', 'nurturing', 'active', 'won', 'lost', 'archived')),
  `consent_status` text DEFAULT 'unknown' NOT NULL
    CHECK (`consent_status` IN ('unknown', 'granted', 'withdrawn')),
  `tags_json` text DEFAULT '[]' NOT NULL CHECK (json_valid(`tags_json`)),
  `notes` text DEFAULT '' NOT NULL,
  `last_contact_at` text DEFAULT '' NOT NULL,
  `next_follow_up_at` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (length(trim(`full_name`)) > 0),
  CHECK (length(trim(`email`)) > 0 OR length(trim(`phone`)) > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_contacts_owner_updated`
  ON `hg_crm_contacts` (`owner_email`, `status`, `updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_contacts_owner_email`
  ON `hg_crm_contacts` (`owner_email`, `email` COLLATE NOCASE);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_contacts_owner_phone`
  ON `hg_crm_contacts` (`owner_email`, `phone`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hg_crm_opportunities` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL REFERENCES `hg_crm_contacts` (`id`) ON DELETE CASCADE,
  `owner_email` text NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE RESTRICT,
  `title` text NOT NULL,
  `kind` text DEFAULT 'purchase' NOT NULL
    CHECK (`kind` IN ('purchase', 'sale', 'lease', 'investment', 'other')),
  `stage` text DEFAULT 'new' NOT NULL
    CHECK (`stage` IN ('new', 'contacted', 'qualified', 'viewing', 'negotiation', 'reservation', 'won', 'lost', 'archived')),
  `estimated_value_aed` integer DEFAULT 0 NOT NULL CHECK (`estimated_value_aed` >= 0),
  `probability` integer DEFAULT 10 NOT NULL CHECK (`probability` BETWEEN 0 AND 100),
  `project_slug` text DEFAULT '' NOT NULL,
  `property_reference` text DEFAULT '' NOT NULL,
  `communities_json` text DEFAULT '[]' NOT NULL CHECK (json_valid(`communities_json`)),
  `bedrooms_json` text DEFAULT '[]' NOT NULL CHECK (json_valid(`bedrooms_json`)),
  `budget_min_aed` integer DEFAULT 0 NOT NULL CHECK (`budget_min_aed` >= 0),
  `budget_max_aed` integer DEFAULT 0 NOT NULL CHECK (`budget_max_aed` >= 0),
  `move_timeline` text DEFAULT '' NOT NULL,
  `next_step` text DEFAULT '' NOT NULL,
  `expected_close_at` text DEFAULT '' NOT NULL,
  `lost_reason` text DEFAULT '' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (length(trim(`title`)) > 0),
  CHECK (`budget_max_aed` = 0 OR `budget_min_aed` = 0 OR `budget_max_aed` >= `budget_min_aed`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_opportunities_owner_stage`
  ON `hg_crm_opportunities` (`owner_email`, `stage`, `updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_opportunities_contact`
  ON `hg_crm_opportunities` (`contact_id`, `updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_opportunities_close`
  ON `hg_crm_opportunities` (`owner_email`, `expected_close_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hg_crm_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL REFERENCES `hg_crm_contacts` (`id`) ON DELETE CASCADE,
  `opportunity_id` text REFERENCES `hg_crm_opportunities` (`id`) ON DELETE SET NULL,
  `owner_email` text NOT NULL REFERENCES `hg_agent_profiles` (`email`) ON DELETE RESTRICT,
  `assigned_by` text NOT NULL,
  `title` text NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `due_at` text DEFAULT '' NOT NULL,
  `priority` text DEFAULT 'normal' NOT NULL
    CHECK (`priority` IN ('low', 'normal', 'high', 'urgent')),
  `status` text DEFAULT 'open' NOT NULL
    CHECK (`status` IN ('open', 'completed', 'cancelled')),
  `completed_at` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (length(trim(`title`)) > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_tasks_owner_due`
  ON `hg_crm_tasks` (`owner_email`, `status`, `due_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_tasks_contact`
  ON `hg_crm_tasks` (`contact_id`, `status`, `due_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hg_crm_activities` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL REFERENCES `hg_crm_contacts` (`id`) ON DELETE CASCADE,
  `opportunity_id` text REFERENCES `hg_crm_opportunities` (`id`) ON DELETE SET NULL,
  `task_id` text REFERENCES `hg_crm_tasks` (`id`) ON DELETE SET NULL,
  `owner_email` text NOT NULL,
  `actor_email` text NOT NULL,
  `type` text NOT NULL
    CHECK (`type` IN ('note', 'call', 'email', 'whatsapp', 'meeting', 'viewing', 'status_change', 'task_completed', 'lead_import', 'system')),
  `subject` text NOT NULL,
  `body` text DEFAULT '' NOT NULL,
  `occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (length(trim(`subject`)) > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_activities_contact`
  ON `hg_crm_activities` (`contact_id`, `occurred_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_activities_owner`
  ON `hg_crm_activities` (`owner_email`, `occurred_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hg_crm_lead_links` (
  `website_lead_id` integer PRIMARY KEY NOT NULL REFERENCES `haus_grace_leads` (`id`) ON DELETE CASCADE,
  `contact_id` text NOT NULL REFERENCES `hg_crm_contacts` (`id`) ON DELETE CASCADE,
  `imported_by` text NOT NULL,
  `imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_lead_links_contact`
  ON `hg_crm_lead_links` (`contact_id`, `imported_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hg_crm_audit_log` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_email` text NOT NULL,
  `owner_email` text NOT NULL,
  `action` text NOT NULL,
  `entity_type` text NOT NULL
    CHECK (`entity_type` IN ('contact', 'opportunity', 'task', 'activity', 'lead')),
  `entity_id` text NOT NULL,
  `changes_json` text DEFAULT '{}' NOT NULL CHECK (json_valid(`changes_json`)),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_audit_owner_created`
  ON `hg_crm_audit_log` (`owner_email`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hg_crm_audit_entity`
  ON `hg_crm_audit_log` (`entity_type`, `entity_id`, `created_at`);
