ALTER TABLE `psr_inbox_messages` ADD COLUMN `sent_at` text DEFAULT '' NOT NULL;
ALTER TABLE `psr_inbox_messages` ADD COLUMN `send_error` text DEFAULT '' NOT NULL;

CREATE INDEX IF NOT EXISTS `idx_psr_inbox_outbound_rate`
  ON `psr_inbox_messages` (`mailbox`, `direction`, `status`, `sent_at` DESC);
