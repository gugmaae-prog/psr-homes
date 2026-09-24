CREATE TABLE IF NOT EXISTS `psr_inbox_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `mailbox` text NOT NULL,
  `direction` text DEFAULT 'inbound' NOT NULL,
  `sender` text NOT NULL,
  `recipients_json` text DEFAULT '[]' NOT NULL,
  `subject` text DEFAULT '(no subject)' NOT NULL,
  `text_body` text DEFAULT '' NOT NULL,
  `html_body` text DEFAULT '' NOT NULL,
  `message_id` text DEFAULT '' NOT NULL,
  `in_reply_to` text DEFAULT '' NOT NULL,
  `references_header` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'unread' NOT NULL,
  `received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_psr_inbox_message_id`
  ON `psr_inbox_messages` (`mailbox`, `message_id`)
  WHERE `message_id` <> '';
CREATE INDEX IF NOT EXISTS `idx_psr_inbox_mailbox_status_date`
  ON `psr_inbox_messages` (`mailbox`, `status`, `received_at` DESC);

CREATE TABLE IF NOT EXISTS `psr_inbox_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `message_id` text NOT NULL,
  `r2_key` text NOT NULL,
  `filename` text NOT NULL,
  `mime_type` text DEFAULT 'application/octet-stream' NOT NULL,
  `size_bytes` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`message_id`) REFERENCES `psr_inbox_messages` (`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_psr_inbox_attachment_message`
  ON `psr_inbox_attachments` (`message_id`);

CREATE TABLE IF NOT EXISTS `psr_public_brief_downloads` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `lead_id` integer NOT NULL,
  `object_key` text NOT NULL,
  `filename` text NOT NULL,
  `expires_at` text NOT NULL,
  `downloaded_at` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_psr_public_brief_expiry`
  ON `psr_public_brief_downloads` (`expires_at`);
