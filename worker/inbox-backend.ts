import PostalMime from "postal-mime";
import { interpretSemanticSearch } from "./semantic-search";
import { putMediaObject, type MediaStorageEnv } from "./media-storage";

type InboxEnv = Env & MediaStorageEnv & {
  EMAIL_INBOX_ENABLED?: string;
  EMAIL_SENDING_ENABLED?: string;
  EMAIL_RECEIVE_DOMAIN?: string;
  EMAIL_CANONICAL_REPLY_TO_ENABLED?: string;
  EMAIL?: SendEmail;
};

type InboxSession = {
  email: string;
  name?: string;
  role: string;
};

type InboxMessageRow = {
  id: string;
  mailbox: string;
  direction: string;
  sender: string;
  recipients_json: string;
  subject: string;
  text_body: string;
  html_body: string;
  message_id: string;
  in_reply_to: string;
  status: string;
  received_at: string;
  updated_at: string;
  sent_at?: string;
  send_error?: string;
};

const MAX_RAW_BYTES = 25_000_000;
const MAX_STORED_ATTACHMENT_BYTES = 24_000_000;
const MAX_OUTBOUND_ATTACHMENT_BYTES = 3_600_000;
const MAX_OUTBOUND_ATTACHMENTS = 12;
const MAX_OUTBOUND_REQUEST_BYTES = 4_500_000;
const MAX_BODY_CHARS = 200_000;
const MAX_AGENT_SENDS_PER_DAY = 50;
const PRIMARY_MAIL_DOMAIN = "psrhomes.ae";

function inboxEnabled(env: InboxEnv) {
  return String(env.EMAIL_INBOX_ENABLED || "false").toLowerCase() === "true";
}

function sendingEnabled(env: InboxEnv) {
  return String(env.EMAIL_SENDING_ENABLED || "false").toLowerCase() === "true" && Boolean(env.EMAIL);
}

async function mailboxProvisioned(env: InboxEnv, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!validEmail(normalized) || !normalized.endsWith(`@${PRIMARY_MAIL_DOMAIN}`)) return false;
  const profile = await env.DB.prepare(
    "SELECT email FROM hg_agent_profiles WHERE lower(email) = ? AND active = 1 LIMIT 1",
  ).bind(normalized).first<{ email: string }>();
  return Boolean(profile);
}

async function mailboxReadiness(env: InboxEnv, email: string) {
  const provisioned = await mailboxProvisioned(env, email);
  return {
    provisioned,
    inbound: provisioned && inboxEnabled(env),
    sending: provisioned && sendingEnabled(env),
  };
}

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").replace(/\r\n/g, "\n").trim().slice(0, max)
    : "";
}

function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}

function arrayValue(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function validEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
    && !/[\r\n]/.test(value);
}

function normalizeMailbox(address: string, env: InboxEnv) {
  const normalized = clean(address, 320).toLowerCase();
  const receiveDomain = clean(env.EMAIL_RECEIVE_DOMAIN, 255).toLowerCase();
  if (!receiveDomain || receiveDomain === PRIMARY_MAIL_DOMAIN || !normalized.endsWith(`@${receiveDomain}`)) {
    return normalized;
  }
  return `${normalized.slice(0, normalized.lastIndexOf("@"))}@${PRIMARY_MAIL_DOMAIN}`;
}

function ingressAddress(address: string, env: InboxEnv) {
  const normalized = clean(address, 320).toLowerCase();
  const receiveDomain = clean(env.EMAIL_RECEIVE_DOMAIN, 255).toLowerCase();
  if (!receiveDomain || !normalized.includes("@")) return normalized;
  return `${normalized.slice(0, normalized.lastIndexOf("@"))}@${receiveDomain}`;
}

function canonicalReplyToEnabled(env: InboxEnv) {
  return String(env.EMAIL_CANONICAL_REPLY_TO_ENABLED || "false").toLowerCase() === "true";
}

function publicMessage(row: InboxMessageRow) {
  return {
    id: row.id,
    mailbox: row.mailbox,
    direction: row.direction,
    sender: row.sender,
    recipients: arrayValue(row.recipients_json),
    subject: row.subject,
    preview: row.text_body.replace(/\s+/g, " ").slice(0, 180),
    status: row.status,
    receivedAt: row.received_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at || "",
  };
}

function pathFor(request: Request) {
  return new URL(request.url).pathname.replace(/^\/h(?:&|%26)g\/properties(?=\/|$)/i, "");
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function readJson(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > 24_000) throw new Error("Request is too large.");
  return await request.json() as Record<string, unknown>;
}

type OutboundAttachment = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: ArrayBuffer;
};

type OutboundPayload = {
  to: string;
  subject: string;
  body: string;
  replyToId: string;
  attachments: OutboundAttachment[];
};

function safeFilename(value: string) {
  return clean(value, 180).replace(/[\r\n\\/]/g, "_") || "attachment";
}

async function readOutboundPayload(request: Request): Promise<OutboundPayload> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    const payload = await readJson(request);
    return {
      to: clean(payload.to, 320).toLowerCase(),
      subject: clean(payload.subject, 200) || "(no subject)",
      body: clean(payload.body, 20_000),
      replyToId: clean(payload.replyToId, 64),
      attachments: [],
    };
  }

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_OUTBOUND_REQUEST_BYTES) throw new Error("Attachments must be 3.6 MB or less combined.");
  const form = await request.formData();
  const files = form.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > MAX_OUTBOUND_ATTACHMENTS) throw new Error(`Attach no more than ${MAX_OUTBOUND_ATTACHMENTS} files.`);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_OUTBOUND_ATTACHMENT_BYTES) throw new Error("Attachments must be 3.6 MB or less combined.");
  const attachments = await Promise.all(files.map(async (file) => ({
    filename: safeFilename(file.name),
    mimeType: clean(file.type, 120) || "application/octet-stream",
    sizeBytes: file.size,
    content: await file.arrayBuffer(),
  })));
  return {
    to: clean(form.get("to"), 320).toLowerCase(),
    subject: clean(form.get("subject"), 200) || "(no subject)",
    body: clean(form.get("body"), 20_000),
    replyToId: clean(form.get("replyToId"), 64),
    attachments,
  };
}

async function storeMessageAttachments(
  env: InboxEnv,
  mailbox: string,
  messageId: string,
  attachments: OutboundAttachment[],
) {
  for (const attachment of attachments) {
    const attachmentId = crypto.randomUUID();
    const key = `inbox/${encodeURIComponent(mailbox)}/${messageId}/${attachmentId}`;
    await putMediaObject(env, key, attachment.content, { httpMetadata: { contentType: attachment.mimeType } });
    await env.DB.prepare(
      `INSERT INTO psr_inbox_attachments (id, message_id, r2_key, filename, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(attachmentId, messageId, key, attachment.filename, attachment.mimeType, attachment.sizeBytes).run();
  }
}

function scopedWhere(session: InboxSession, alias = "") {
  const field = `${alias}mailbox`;
  return { sql: `${field} = ?`, values: [session.email.toLowerCase()] };
}

export async function handleInboxRequest(
  request: Request,
  env: InboxEnv,
  session: InboxSession,
): Promise<Response | null> {
  const path = pathFor(request);
  if (!path.startsWith("/api/agent/inbox")) return null;
  const readiness = await mailboxReadiness(env, session.email);
  const scope = scopedWhere(session);

  if (path === "/api/agent/inbox" && request.method === "GET") {
    const url = new URL(request.url);
    const folder = clean(url.searchParams.get("folder"), 20).toLowerCase() || "inbox";
    const query = clean(url.searchParams.get("q"), 320);
    const searchIntent = await interpretSemanticSearch(query, "inbox", env);
    const folderSql = folder === "drafts"
      ? "direction = 'outbound' AND status = 'draft'"
      : folder === "sent"
        ? "direction = 'outbound' AND status IN ('sending', 'sent', 'failed')"
        : folder === "archive"
          ? "status = 'archived'"
          : folder === "all"
            ? "1 = 1"
            : "direction = 'inbound' AND status <> 'archived'";
    const searchSql = searchIntent.terms
      .map(() => "AND (lower(sender) LIKE ? OR lower(recipients_json) LIKE ? OR lower(subject) LIKE ? OR lower(text_body) LIKE ?)")
      .join(" ");
    const searchValues = searchIntent.terms.flatMap((term) => {
      const pattern = `%${term.toLowerCase().replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
      return [pattern, pattern, pattern, pattern];
    });
    const semanticStatusSql = searchIntent.status === "unread"
      ? "AND status = 'unread'"
      : searchIntent.status === "read"
        ? "AND direction = 'inbound' AND status NOT IN ('unread', 'archived')"
        : searchIntent.status === "draft"
          ? "AND direction = 'outbound' AND status = 'draft'"
          : searchIntent.status === "sent"
            ? "AND direction = 'outbound' AND status = 'sent'"
            : searchIntent.status === "failed"
              ? "AND status = 'failed'"
              : searchIntent.status === "archived"
                ? "AND status = 'archived'"
                : "";
    const rows = await env.DB.prepare(
      `SELECT id, mailbox, direction, sender, recipients_json, subject, text_body, html_body,
              message_id, in_reply_to, status, received_at, updated_at, sent_at, send_error
       FROM psr_inbox_messages
       WHERE ${scope.sql} AND ${folderSql} ${semanticStatusSql} ${searchSql}
       ORDER BY received_at DESC LIMIT 100`,
    ).bind(...scope.values, ...searchValues).all<InboxMessageRow>();
    const counts = await env.DB.prepare(
      `SELECT
         SUM(CASE WHEN direction = 'inbound' AND status <> 'archived' THEN 1 ELSE 0 END) AS inbox,
         SUM(CASE WHEN direction = 'inbound' AND status = 'unread' THEN 1 ELSE 0 END) AS unread,
         SUM(CASE WHEN direction = 'outbound' AND status = 'draft' THEN 1 ELSE 0 END) AS drafts,
         SUM(CASE WHEN direction = 'outbound' AND status IN ('sending', 'sent', 'failed') THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archive,
         COUNT(*) AS all_count
       FROM psr_inbox_messages WHERE ${scope.sql}`,
    ).bind(...scope.values).first<Record<string, number | null>>();
    return json({
      activation: readiness.inbound ? "active" : "pending",
      inboundActivation: readiness.inbound ? "active" : "pending",
      sendingActivation: readiness.sending ? "active" : "pending",
      mailbox: session.email,
      receiveAddress: session.email,
      canReply: readiness.sending,
      canSend: readiness.sending,
      folder,
      searchIntent,
      counts: {
        inbox: Number(counts?.inbox || 0),
        unread: Number(counts?.unread || 0),
        drafts: Number(counts?.drafts || 0),
        sent: Number(counts?.sent || 0),
        archive: Number(counts?.archive || 0),
        all: Number(counts?.all_count || 0),
      },
      messages: rows.results.map(publicMessage),
    });
  }

  if (path === "/api/agent/inbox/drafts" && request.method === "POST") {
    if (!originAllowed(request)) return json({ error: "Invalid request origin." }, 403);
    let payload: OutboundPayload;
    try {
      payload = await readOutboundPayload(request);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "The draft is too large." }, 413);
    }
    const { to, subject, body } = payload;
    if (!validEmail(to) || !body) {
      return json({ error: "Enter a valid recipient and message." }, 400);
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO psr_inbox_messages
       (id, mailbox, direction, sender, recipients_json, subject, text_body, status, received_at, created_at, updated_at)
       VALUES (?, ?, 'outbound', ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    ).bind(id, session.email, session.email, JSON.stringify([to]), subject, body).run();
    await storeMessageAttachments(env, session.email, id, payload.attachments);
    return json({ ok: true, id, activation: readiness.inbound ? "active" : "pending" }, 201);
  }

  if (path === "/api/agent/inbox/send" && request.method === "POST") {
    if (!originAllowed(request)) return json({ error: "Invalid request origin." }, 403);
    if (!readiness.sending) {
      return json({ error: "PSR email sending is not provisioned for this mailbox." }, 503);
    }
    let payload: OutboundPayload;
    try {
      payload = await readOutboundPayload(request);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "The message is too large." }, 413);
    }
    const { to, subject, body, replyToId } = payload;
    if (!validEmail(to) || !body) {
      return json({ error: "Enter one valid recipient and a message." }, 400);
    }
    if (!session.email.toLowerCase().endsWith(`@${PRIMARY_MAIL_DOMAIN}`)) {
      return json({ error: "Only an active PSR company mailbox can send." }, 403);
    }
    const activeAgent = await env.DB.prepare(
      "SELECT display_name FROM hg_agent_profiles WHERE email = ? AND active = 1 LIMIT 1",
    ).bind(session.email).first<{ display_name: string }>();
    if (!activeAgent) return json({ error: "This PSR mailbox is not active." }, 403);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM psr_inbox_messages
       WHERE mailbox = ? AND direction = 'outbound' AND status = 'sent'
         AND datetime(sent_at) >= datetime('now', '-1 day')`,
    ).bind(session.email).first<{ count: number }>();
    if (Number(recent?.count || 0) >= MAX_AGENT_SENDS_PER_DAY) {
      return json({ error: "This mailbox reached its daily one-to-one sending limit." }, 429);
    }

    let inReplyTo = "";
    let references = "";
    if (replyToId) {
      const replySource = await env.DB.prepare(
        `SELECT message_id, references_header FROM psr_inbox_messages
         WHERE id = ? AND mailbox = ? AND direction = 'inbound' LIMIT 1`,
      ).bind(replyToId, session.email).first<{ message_id: string; references_header: string }>();
      if (!replySource) return json({ error: "The reply source is unavailable." }, 404);
      inReplyTo = clean(replySource.message_id, 500);
      references = clean(`${replySource.references_header || ""} ${inReplyTo}`, 2_000);
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO psr_inbox_messages
       (id, mailbox, direction, sender, recipients_json, subject, text_body, message_id,
        in_reply_to, references_header, status, received_at, created_at, updated_at)
       VALUES (?, ?, 'outbound', ?, ?, ?, ?, '', ?, ?, 'sending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    ).bind(id, session.email, session.email, JSON.stringify([to]), subject, body, inReplyTo, references).run();
    await storeMessageAttachments(env, session.email, id, payload.attachments);

    try {
      const headers: Record<string, string> = {};
      if (inReplyTo) headers["In-Reply-To"] = inReplyTo;
      if (references) headers.References = references;
      const result = await env.EMAIL!.send({
        from: { email: session.email, name: clean(session.name || activeAgent.display_name, 100) || activeAgent.display_name },
        replyTo: canonicalReplyToEnabled(env) ? session.email : ingressAddress(session.email, env),
        to,
        subject,
        text: body,
        ...(payload.attachments.length ? {
          attachments: payload.attachments.map((attachment) => ({
            content: attachment.content,
            filename: attachment.filename,
            type: attachment.mimeType,
            disposition: "attachment" as const,
          })),
        } : {}),
        ...(Object.keys(headers).length ? { headers } : {}),
      });
      await env.DB.prepare(
        `UPDATE psr_inbox_messages
         SET status = 'sent', message_id = ?, sent_at = CURRENT_TIMESTAMP, send_error = '', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND mailbox = ?`,
      ).bind(clean(result.messageId, 500), id, session.email).run();
      return json({ ok: true, id, status: "sent" }, 201);
    } catch (error) {
      const reason = error instanceof Error ? clean(error.message, 500) : "Cloudflare email delivery failed.";
      await env.DB.prepare(
        `UPDATE psr_inbox_messages SET status = 'failed', send_error = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND mailbox = ?`,
      ).bind(reason || "Cloudflare email delivery failed.", id, session.email).run();
      console.error(JSON.stringify({ event: "agent_email_send_failed", mailbox: session.email, messageId: id }));
      return json({ error: "The message was not accepted by the verified PSR sender." }, 502);
    }
  }

  const attachmentMatch = path.match(/^\/api\/agent\/inbox\/attachments\/([a-f0-9-]{36})$/i);
  if (attachmentMatch && request.method === "GET") {
    const attachmentScope = scopedWhere(session, "m.");
    const row = await env.DB.prepare(
      `SELECT a.r2_key, a.filename, a.mime_type, m.mailbox
       FROM psr_inbox_attachments a
       JOIN psr_inbox_messages m ON m.id = a.message_id
       WHERE a.id = ? AND ${attachmentScope.sql} LIMIT 1`,
    ).bind(attachmentMatch[1], ...attachmentScope.values).first<{
      r2_key: string; filename: string; mime_type: string; mailbox: string;
    }>();
    if (!row) return json({ error: "Attachment not found." }, 404);
    const object = await env.MEDIA.get(row.r2_key);
    if (!object) return json({ error: "Attachment is unavailable." }, 404);
    return new Response(object.body, {
      headers: {
        "cache-control": "private, no-store",
        "content-type": row.mime_type,
        "content-disposition": `attachment; filename="${row.filename.replace(/["\\]/g, "_")}"`,
        "x-content-type-options": "nosniff",
      },
    });
  }

  const messageMatch = path.match(/^\/api\/agent\/inbox\/([a-f0-9-]{36})$/i);
  if (messageMatch && request.method === "GET") {
    const row = await env.DB.prepare(
      `SELECT id, mailbox, direction, sender, recipients_json, subject, text_body, html_body,
              message_id, in_reply_to, status, received_at, updated_at, sent_at, send_error
       FROM psr_inbox_messages WHERE id = ? AND ${scope.sql} LIMIT 1`,
    ).bind(messageMatch[1], ...scope.values).first<InboxMessageRow>();
    if (!row) return json({ error: "Message not found." }, 404);
    const attachments = await env.DB.prepare(
      `SELECT id, filename, mime_type, size_bytes FROM psr_inbox_attachments
       WHERE message_id = ? ORDER BY created_at`,
    ).bind(row.id).all<{ id: string; filename: string; mime_type: string; size_bytes: number }>();
    if (row.status === "unread") {
      await env.DB.prepare(
        "UPDATE psr_inbox_messages SET status = 'read', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND mailbox = ?",
      ).bind(row.id, session.email.toLowerCase()).run();
    }
    return json({ message: { ...publicMessage({ ...row, status: row.status === "unread" ? "read" : row.status }), body: row.text_body, html: "", attachments: attachments.results } });
  }

  if (messageMatch && request.method === "PATCH") {
    if (!originAllowed(request)) return json({ error: "Invalid request origin." }, 403);
    const payload = await readJson(request);
    const status = payload.status === "archived" ? "archived" : payload.status === "unread" ? "unread" : "read";
    const result = await env.DB.prepare(
      `UPDATE psr_inbox_messages SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND ${scope.sql}`,
    ).bind(status, messageMatch[1], ...scope.values).run();
    return result.meta.changes ? json({ ok: true, status }) : json({ error: "Message not found." }, 404);
  }

  return json({ error: "Inbox endpoint not found." }, 404);
}

export async function ingestInboxEmail(message: ForwardableEmailMessage, env: InboxEnv): Promise<void> {
  if (!inboxEnabled(env)) {
    message.setReject("PSR inbox activation is pending.");
    return;
  }
  if (message.rawSize > MAX_RAW_BYTES) {
    message.setReject("Message exceeds the PSR inbox size limit.");
    return;
  }

  const mailbox = normalizeMailbox(message.to, env);
  if (!validEmail(mailbox) || !(await mailboxProvisioned(env, mailbox))) {
    message.setReject("PSR mailbox is not provisioned.");
    return;
  }

  const raw = await new Response(message.raw).arrayBuffer();
  const parsed = await PostalMime.parse(raw);
  const id = crypto.randomUUID();
  const headerSender = parsed.from && "address" in parsed.from
    ? clean(parsed.from.address, 320).toLowerCase()
    : "";
  const envelopeSender = clean(message.from, 320).toLowerCase();
  const sender = validEmail(headerSender) ? headerSender : envelopeSender;
  if (!validEmail(mailbox) || !validEmail(sender)) {
    message.setReject("Invalid sender or recipient address.");
    return;
  }
  const subject = clean(parsed.subject, 200) || "(no subject)";
  const textBody = clean(parsed.text || "", MAX_BODY_CHARS);
  const htmlBody = clean(parsed.html || "", MAX_BODY_CHARS);
  const messageId = clean(message.headers.get("message-id"), 500);
  const inReplyTo = clean(message.headers.get("in-reply-to"), 500);
  const references = clean(message.headers.get("references"), 2_000);
  const recipients = [mailbox];

  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO psr_inbox_messages
     (id, mailbox, direction, sender, recipients_json, subject, text_body, html_body,
      message_id, in_reply_to, references_header, status, received_at, created_at, updated_at)
     VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, 'unread', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).bind(id, mailbox, sender, JSON.stringify(recipients), subject, textBody, htmlBody, messageId, inReplyTo, references).run();
  if (!inserted.meta.changes) return;

  for (const attachment of parsed.attachments.slice(0, 12)) {
    const content = typeof attachment.content === "string"
      ? new TextEncoder().encode(attachment.content)
      : attachment.content instanceof ArrayBuffer
        ? new Uint8Array(attachment.content)
        : attachment.content;
    if (!content || content.byteLength > MAX_STORED_ATTACHMENT_BYTES) continue;
    const attachmentId = crypto.randomUUID();
    const filename = safeFilename(attachment.filename || "");
    const mimeType = clean(attachment.mimeType, 120) || "application/octet-stream";
    const key = `inbox/${encodeURIComponent(mailbox)}/${id}/${attachmentId}`;
    await putMediaObject(env, key, content, { httpMetadata: { contentType: mimeType } });
    await env.DB.prepare(
      `INSERT INTO psr_inbox_attachments (id, message_id, r2_key, filename, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(attachmentId, id, key, filename, mimeType, content.byteLength).run();
  }
}
