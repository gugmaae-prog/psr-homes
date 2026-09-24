CREATE UNIQUE INDEX IF NOT EXISTS `uq_hg_crm_contacts_owner_email_active`
  ON `hg_crm_contacts` (`owner_email`, lower(`email`))
  WHERE `email` <> '' AND `status` <> 'archived';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `uq_hg_crm_contacts_owner_phone_active`
  ON `hg_crm_contacts` (`owner_email`, `phone`)
  WHERE `phone` <> '' AND `status` <> 'archived';
