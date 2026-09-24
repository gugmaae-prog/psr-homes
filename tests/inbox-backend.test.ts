import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { handleInboxRequest, ingestInboxEmail } from "../worker/inbox-backend";

const migrationPaths = [
  "../drizzle-agent/0021_psr_inbox_and_public_briefs.sql",
  "../drizzle-agent/0022_psr_agent_inbox_send.sql",
].map((path) => fileURLToPath(new URL(path, import.meta.url)));

function values(input: unknown[]): SQLInputValue[] {
  return input.map((value) => {
    if (value === undefined) throw new TypeError("Undefined cannot be bound to SQLite.");
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === null || ["string", "number", "bigint"].includes(typeof value)) return value as SQLInputValue;
    throw new TypeError(`Unsupported SQLite value: ${typeof value}`);
  });
}

function meta(changes = 0): D1Meta & Record<string, unknown> {
  return { duration: 0, size_after: 0, rows_read: 0, rows_written: changes, last_row_id: 0, changed_db: changes > 0, changes };
}

class Statement implements D1PreparedStatement {
  private bound: unknown[] = [];
  constructor(private readonly database: DatabaseSync, private readonly query: string) {}
  bind(...input: unknown[]): D1PreparedStatement {
    const next = new Statement(this.database, this.query);
    next.bound = input;
    return next;
  }
  first<T = unknown>(colName: string): Promise<T | null>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const row = this.database.prepare(this.query).get(...values(this.bound)) as Record<string, unknown> | undefined;
    return row ? (colName ? row[colName] : row) as T : null;
  }
  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const result = this.database.prepare(this.query).run(...values(this.bound));
    return { success: true, meta: meta(Number(result.changes)), results: [] };
  }
  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const results = this.database.prepare(this.query).all(...values(this.bound)) as T[];
    return { success: true, meta: meta(), results };
  }
  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> {
    const statement = this.database.prepare(this.query);
    statement.setReturnArrays(true);
    const rows = statement.all(...values(this.bound)) as T[];
    return options?.columnNames ? [statement.columns().map((column) => column.name), ...rows] : rows;
  }
}

class Database implements D1Database {
  constructor(readonly sqlite: DatabaseSync) {}
  prepare(query: string) { return new Statement(this.sqlite, query); }
  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const output: D1Result<T>[] = [];
    for (const statement of statements) output.push(await statement.run<T>());
    return output;
  }
  async exec(query: string) { this.sqlite.exec(query); return { count: 0, duration: 0 }; }
  withSession(): D1DatabaseSession { throw new Error("D1 sessions are unnecessary here."); }
  async dump() { return new ArrayBuffer(0); }
}

function setup(enabled = "false") {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE hg_agent_profiles (
    email TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent',
    active INTEGER NOT NULL DEFAULT 1
  );`);
  for (const migrationPath of migrationPaths) sqlite.exec(readFileSync(migrationPath, "utf8"));
  sqlite.prepare("INSERT INTO hg_agent_profiles (email, display_name, role, active) VALUES (?, ?, 'agent', 1)")
    .run("agent.one@psrhomes.ae", "Agent One");
  sqlite.prepare("INSERT INTO hg_agent_profiles (email, display_name, role, active) VALUES (?, ?, 'agent', 1)")
    .run("agent.two@psrhomes.ae", "Agent Two");
  sqlite.prepare("INSERT INTO hg_agent_profiles (email, display_name, role, active) VALUES (?, ?, 'admin', 1)")
    .run("admin@psrhomes.ae", "PSR Administrator");
  const sent: EmailMessageBuilder[] = [];
  const mediaStore = new Map<string, Uint8Array>();
  const env = {
    DB: new Database(sqlite),
    MEDIA: {
      async put(key: string, value: ArrayBuffer | ArrayBufferView | string) {
        const bytes = typeof value === "string"
          ? new TextEncoder().encode(value)
          : value instanceof ArrayBuffer
            ? new Uint8Array(value.slice(0))
            : new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
        mediaStore.set(key, bytes);
        return {};
      },
      async get(key: string) {
        const bytes = mediaStore.get(key);
        return bytes ? { body: new Response(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer).body } : null;
      },
    } as unknown as R2Bucket,
    EMAIL_INBOX_ENABLED: "false",
    EMAIL_RECEIVE_DOMAIN: "inbox.psrhomes.ae",
    EMAIL_SENDING_ENABLED: enabled,
    EMAIL: {
      async send(message: EmailMessageBuilder) {
        sent.push(message);
        return { messageId: "cf-test-message-id" };
      },
    } as SendEmail,
  } as unknown as Parameters<typeof handleInboxRequest>[1];
  return { sqlite, env, sent, mediaStore };
}

const agentOne = { email: "agent.one@psrhomes.ae", name: "Agent One", role: "agent" };
const agentTwo = { email: "agent.two@psrhomes.ae", name: "Agent Two", role: "agent" };
const administrator = { email: "admin@psrhomes.ae", name: "PSR Administrator", role: "admin" };

function request(path: string, method = "GET", body?: Record<string, unknown>) {
  return new Request(`https://psr.espacios.me${path}`, {
    method,
    headers: { origin: "https://psr.espacios.me", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function multipartRequest(path: string, fields: Record<string, string>, files: Array<{ name: string; type: string; content: BlobPart }> = []) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.set(key, value));
  files.forEach((file) => form.append("attachments", new Blob([file.content], { type: file.type }), file.name));
  return new Request(`https://psr.espacios.me${path}`, {
    method: "POST",
    headers: { origin: "https://psr.espacios.me" },
    body: form,
  });
}

test("agent inbox keeps delivery disabled until the verified sender switch is enabled", async () => {
  const { sqlite, env, sent } = setup();
  try {
    const response = await handleInboxRequest(request("/api/agent/inbox/send", "POST", {
      to: "client@example.com", subject: "Private viewing", body: "Your viewing is confirmed.", from: agentTwo.email,
    }), env, agentOne) as Response;
    assert.equal(response.status, 503);
    assert.equal(sent.length, 0);
  } finally {
    sqlite.close();
  }
});

test("mailbox readiness follows the active Cloudflare D1 identity immediately", async () => {
  const { sqlite, env, sent } = setup("true");
  try {
    Object.assign(env, { EMAIL_INBOX_ENABLED: "true" });
    sqlite.prepare("UPDATE hg_agent_profiles SET active = 0 WHERE email = ?").run(agentTwo.email);

    const readyResponse = await handleInboxRequest(request("/api/agent/inbox"), env, agentOne) as Response;
    const ready = await readyResponse.json() as {
      activation: string;
      inboundActivation: string;
      sendingActivation: string;
      receiveAddress: string;
      canReply: boolean;
      canSend: boolean;
    };
    assert.equal(ready.activation, "active");
    assert.equal(ready.inboundActivation, "active");
    assert.equal(ready.sendingActivation, "active");
    assert.equal(ready.receiveAddress, agentOne.email);
    assert.equal(ready.canReply, true);
    assert.equal(ready.canSend, true);

    const pendingResponse = await handleInboxRequest(request("/api/agent/inbox"), env, agentTwo) as Response;
    const pending = await pendingResponse.json() as typeof ready;
    assert.equal(pending.activation, "pending");
    assert.equal(pending.inboundActivation, "pending");
    assert.equal(pending.sendingActivation, "pending");
    assert.equal(pending.canReply, false);
    assert.equal(pending.canSend, false);

    const sendResponse = await handleInboxRequest(request("/api/agent/inbox/send", "POST", {
      to: "client@example.com",
      subject: "Private viewing",
      body: "This unprovisioned mailbox must not send.",
    }), env, agentTwo) as Response;
    assert.equal(sendResponse.status, 503);
    assert.equal(sent.length, 0);

    let rejection = "";
    const inboundRaw = [
      "From: Buyer <buyer@example.com>",
      "To: Agent Two <agent.two@inbox.psrhomes.ae>",
      "Subject: Private viewing",
      "Message-ID: <unprovisioned@example.com>",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Hello",
    ].join("\r\n");
    await ingestInboxEmail({
      from: "buyer@example.com",
      to: "agent.two@inbox.psrhomes.ae",
      headers: new Headers({ "message-id": "<unprovisioned@example.com>" }),
      raw: new Blob([inboundRaw]).stream(),
      rawSize: inboundRaw.length,
      setReject(reason: string) { rejection = reason; },
    } as unknown as ForwardableEmailMessage, env);
    assert.match(rejection, /not provisioned/i);
    const inboundCount = sqlite.prepare("SELECT COUNT(*) AS count FROM psr_inbox_messages").get() as { count: number };
    assert.equal(inboundCount.count, 0);

    sqlite.prepare("UPDATE hg_agent_profiles SET active = 1 WHERE email = ?").run(agentTwo.email);
    const reactivatedResponse = await handleInboxRequest(request("/api/agent/inbox"), env, agentTwo) as Response;
    const reactivated = await reactivatedResponse.json() as typeof ready;
    assert.equal(reactivated.activation, "active");
    assert.equal(reactivated.sendingActivation, "active");
    assert.equal(reactivated.canSend, true);
  } finally {
    sqlite.close();
  }
});

test("enabled inbox sends one-to-one from the signed-in agent and records the delivery", async () => {
  const { sqlite, env, sent } = setup("true");
  try {
    const response = await handleInboxRequest(request("/api/agent/inbox/send", "POST", {
      to: "client@example.com", subject: "Private viewing", body: "Your viewing is confirmed.",
    }), env, agentOne) as Response;
    assert.equal(response.status, 201);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].from, { email: agentOne.email, name: agentOne.name });
    assert.equal(sent[0].to, "client@example.com");
    assert.equal(sent[0].replyTo, "agent.one@inbox.psrhomes.ae");
    const row = sqlite.prepare("SELECT mailbox, direction, status, message_id FROM psr_inbox_messages").get() as Record<string, unknown>;
    assert.equal(row.mailbox, agentOne.email);
    assert.equal(row.direction, "outbound");
    assert.equal(row.status, "sent");
    assert.equal(row.message_id, "cf-test-message-id");
  } finally {
    sqlite.close();
  }
});

test("canonical Reply-To activates only after the dual-delivery readiness switch", async () => {
  const { sqlite, env, sent } = setup("true");
  try {
    Object.assign(env, { EMAIL_CANONICAL_REPLY_TO_ENABLED: "true" });
    const response = await handleInboxRequest(request("/api/agent/inbox/send", "POST", {
      to: "client@example.com",
      subject: "Canonical reply path",
      body: "Reply to the visible PSR company address.",
    }), env, agentOne) as Response;
    assert.equal(response.status, 201);
    assert.equal(sent[0].replyTo, agentOne.email);
  } finally {
    sqlite.close();
  }
});

test("outbound attachments are sent, stored and downloadable from the owning mailbox", async () => {
  const { sqlite, env, sent, mediaStore } = setup("true");
  try {
    const response = await handleInboxRequest(multipartRequest("/api/agent/inbox/send", {
      to: "client@example.com",
      subject: "Project brochure",
      body: "The requested brochure is attached.",
    }, [{ name: "brochure.txt", type: "text/plain", content: "PSR brochure" }]), env, agentOne) as Response;
    assert.equal(response.status, 201);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].attachments?.length, 1);
    assert.equal(sent[0].attachments?.[0]?.filename, "brochure.txt");
    assert.equal(sent[0].attachments?.[0]?.type, "text/plain");

    const row = sqlite.prepare("SELECT id, message_id, filename, mime_type, size_bytes, r2_key FROM psr_inbox_attachments").get() as Record<string, unknown>;
    assert.equal(row.filename, "brochure.txt");
    assert.equal(row.mime_type, "text/plain");
    assert.equal(row.size_bytes, 12);
    assert.equal(mediaStore.has(String(row.r2_key)), true);

    const download = await handleInboxRequest(request(`/api/agent/inbox/attachments/${row.id}`), env, agentOne) as Response;
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-disposition"), 'attachment; filename="brochure.txt"');
    assert.equal(await download.text(), "PSR brochure");
  } finally {
    sqlite.close();
  }
});

test("outbound attachments enforce the reliable whole-message delivery ceiling", async () => {
  const { sqlite, env, sent } = setup("true");
  try {
    const response = await handleInboxRequest(multipartRequest("/api/agent/inbox/send", {
      to: "client@example.com",
      subject: "Oversized file",
      body: "This should be rejected before delivery.",
    }, [{ name: "too-large.bin", type: "application/octet-stream", content: new Uint8Array(3_600_001) }]), env, agentOne) as Response;
    assert.equal(response.status, 413);
    assert.match((await response.json() as { error: string }).error, /3\.6 MB or less combined/i);
    assert.equal(sent.length, 0);
  } finally {
    sqlite.close();
  }
});

test("inbound routing normalizes the Cloudflare ingress subdomain to the canonical agent mailbox", async () => {
  const { sqlite, env } = setup("true");
  try {
    Object.assign(env, { EMAIL_INBOX_ENABLED: "true" });
    const raw = [
      "From: Buyer <buyer@example.com>",
      "To: Agent One <agent.one@inbox.psrhomes.ae>",
      "Subject: Viewing request",
      "Message-ID: <inbound-test@example.com>",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Please arrange a private viewing.",
    ].join("\r\n");
    let rejection = "";
    const message = {
      from: "bounces@cf-bounce.psrhomes.ae",
      to: "agent.one@inbox.psrhomes.ae",
      headers: new Headers({ "message-id": "<inbound-test@example.com>" }),
      raw: new Blob([raw]).stream(),
      rawSize: raw.length,
      setReject(reason: string) { rejection = reason; },
    } as unknown as ForwardableEmailMessage;

    await ingestInboxEmail(message, env);

    assert.equal(rejection, "");
    const row = sqlite.prepare(
      "SELECT mailbox, direction, sender, subject, text_body, status FROM psr_inbox_messages",
    ).get() as Record<string, unknown>;
    assert.equal(row.mailbox, agentOne.email);
    assert.equal(row.direction, "inbound");
    assert.equal(row.sender, "buyer@example.com");
    assert.equal(row.subject, "Viewing request");
    assert.equal(row.text_body, "Please arrange a private viewing.");
    assert.equal(row.status, "unread");
  } finally {
    sqlite.close();
  }
});

test("inbound attachments are retained and exposed through the scoped download route", async () => {
  const { sqlite, env } = setup("true");
  try {
    Object.assign(env, { EMAIL_INBOX_ENABLED: "true" });
    const raw = [
      "From: Buyer <buyer@example.com>",
      "To: Agent One <agent.one@inbox.psrhomes.ae>",
      "Subject: Signed reservation",
      "Message-ID: <inbound-attachment@example.com>",
      'Content-Type: multipart/mixed; boundary="psr-boundary"',
      "",
      "--psr-boundary",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "The signed reservation is attached.",
      "--psr-boundary",
      'Content-Type: application/pdf; name="reservation.pdf"',
      "Content-Disposition: attachment; filename=\"reservation.pdf\"",
      "Content-Transfer-Encoding: base64",
      "",
      "JVBERi0xLjQKUFNS",
      "--psr-boundary--",
      "",
    ].join("\r\n");
    let rejection = "";
    const message = {
      from: "buyer@example.com",
      to: "agent.one@inbox.psrhomes.ae",
      headers: new Headers({ "message-id": "<inbound-attachment@example.com>" }),
      raw: new Blob([raw]).stream(),
      rawSize: raw.length,
      setReject(reason: string) { rejection = reason; },
    } as unknown as ForwardableEmailMessage;

    await ingestInboxEmail(message, env);
    assert.equal(rejection, "");
    const attachment = sqlite.prepare("SELECT id, filename, mime_type FROM psr_inbox_attachments").get() as Record<string, unknown>;
    assert.equal(attachment.filename, "reservation.pdf");
    assert.equal(attachment.mime_type, "application/pdf");
    const download = await handleInboxRequest(request(`/api/agent/inbox/attachments/${attachment.id}`), env, agentOne) as Response;
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "application/pdf");
    assert.equal(new TextDecoder().decode(await download.arrayBuffer()), "%PDF-1.4\nPSR");
  } finally {
    sqlite.close();
  }
});

test("duplicate inbound replay returns before writing attachment objects or metadata", async () => {
  const { sqlite, env, mediaStore } = setup("true");
  try {
    Object.assign(env, { EMAIL_INBOX_ENABLED: "true" });
    const raw = [
      "From: Buyer <buyer@example.com>",
      "To: Agent One <agent.one@inbox.psrhomes.ae>",
      "Subject: Reservation replay",
      "Message-ID: <duplicate-attachment@example.com>",
      'Content-Type: multipart/mixed; boundary="psr-duplicate"',
      "",
      "--psr-duplicate",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "The reservation is attached.",
      "--psr-duplicate",
      'Content-Type: application/pdf; name="reservation.pdf"',
      'Content-Disposition: attachment; filename="reservation.pdf"',
      "Content-Transfer-Encoding: base64",
      "",
      "JVBERi0xLjQKUFNS",
      "--psr-duplicate--",
      "",
    ].join("\r\n");
    const inbound = () => ({
      from: "buyer@example.com",
      to: "agent.one@inbox.psrhomes.ae",
      headers: new Headers({ "message-id": "<duplicate-attachment@example.com>" }),
      raw: new Blob([raw]).stream(),
      rawSize: raw.length,
      setReject() {},
    } as unknown as ForwardableEmailMessage);

    await ingestInboxEmail(inbound(), env);
    await ingestInboxEmail(inbound(), env);

    const messages = sqlite.prepare("SELECT COUNT(*) AS count FROM psr_inbox_messages").get() as { count: number };
    const attachments = sqlite.prepare("SELECT COUNT(*) AS count FROM psr_inbox_attachments").get() as { count: number };
    assert.equal(messages.count, 1);
    assert.equal(attachments.count, 1);
    assert.equal(mediaStore.size, 1);
  } finally {
    sqlite.close();
  }
});

test("agents cannot read another agent's stored messages", async () => {
  const { sqlite, env } = setup("true");
  try {
    Object.assign(env, { EMAIL_INBOX_ENABLED: "true", EMAIL_RECEIVE_DOMAIN: "psrhomes.ae" });
    const privateMessageId = "11111111-1111-4111-8111-111111111111";
    sqlite.prepare(`INSERT INTO psr_inbox_messages
      (id, mailbox, direction, sender, recipients_json, subject, text_body, status)
      VALUES (?, ?, 'inbound', 'client@example.com', ?, 'Private', 'Confidential', 'unread')`)
      .run(privateMessageId, agentOne.email, JSON.stringify([agentOne.email]));
    const list = await handleInboxRequest(request("/api/agent/inbox"), env, agentTwo) as Response;
    const payload = await list.json() as { activation: string; receiveAddress: string; messages: unknown[] };
    assert.equal(list.status, 200);
    assert.equal(payload.activation, "active");
    assert.equal(payload.receiveAddress, "agent.two@psrhomes.ae");
    assert.equal(payload.messages.length, 0);
    const detail = await handleInboxRequest(request(`/api/agent/inbox/${privateMessageId}`), env, agentTwo) as Response;
    assert.equal(detail.status, 404);
  } finally {
    sqlite.close();
  }
});

test("administrator mail remains isolated from every other staff mailbox", async () => {
  const { sqlite, env, sent } = setup("true");
  try {
    Object.assign(env, { EMAIL_INBOX_ENABLED: "true", EMAIL_RECEIVE_DOMAIN: "psrhomes.ae" });
    const agentMessageId = "22222222-2222-4222-8222-222222222222";
    const adminMessageId = "33333333-3333-4333-8333-333333333333";
    const attachmentId = "44444444-4444-4444-8444-444444444444";
    const insert = sqlite.prepare(`INSERT INTO psr_inbox_messages
      (id, mailbox, direction, sender, recipients_json, subject, text_body, status)
      VALUES (?, ?, 'inbound', 'client@example.com', ?, ?, ?, 'unread')`);
    insert.run(agentMessageId, agentOne.email, JSON.stringify([agentOne.email]), "Agent confidential", "Private agent content");
    insert.run(adminMessageId, administrator.email, JSON.stringify([administrator.email]), "Administrator confidential", "Private administrator content");
    sqlite.prepare(`INSERT INTO psr_inbox_attachments
      (id, message_id, r2_key, filename, mime_type, size_bytes)
      VALUES (?, ?, 'private/agent-only.pdf', 'agent-only.pdf', 'application/pdf', 1200)`)
      .run(attachmentId, agentMessageId);

    const list = await handleInboxRequest(request("/api/agent/inbox?folder=all"), env, administrator) as Response;
    const payload = await list.json() as { counts: { all: number }; messages: Array<{ id: string }> };
    assert.equal(list.status, 200);
    assert.equal(payload.counts.all, 1);
    assert.deepEqual(payload.messages.map((message) => message.id), [adminMessageId]);

    const detail = await handleInboxRequest(request(`/api/agent/inbox/${agentMessageId}`), env, administrator) as Response;
    assert.equal(detail.status, 404);
    const archive = await handleInboxRequest(request(`/api/agent/inbox/${agentMessageId}`, "PATCH", { status: "archived" }), env, administrator) as Response;
    assert.equal(archive.status, 404);
    const download = await handleInboxRequest(request(`/api/agent/inbox/attachments/${attachmentId}`), env, administrator) as Response;
    assert.equal(download.status, 404);

    const reply = await handleInboxRequest(request("/api/agent/inbox/send", "POST", {
      to: "client@example.com",
      subject: "Re: Agent confidential",
      body: "This must not send.",
      replyToId: agentMessageId,
    }), env, administrator) as Response;
    assert.equal(reply.status, 404);
    assert.equal(sent.length, 0);
  } finally {
    sqlite.close();
  }
});

test("mail folders, counts and search stay scoped to the signed-in agent", async () => {
  const { sqlite, env } = setup("true");
  try {
    Object.assign(env, { EMAIL_INBOX_ENABLED: "true", EMAIL_RECEIVE_DOMAIN: "psrhomes.ae" });
    const insert = sqlite.prepare(`INSERT INTO psr_inbox_messages
      (id, mailbox, direction, sender, recipients_json, subject, text_body, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insert.run("agent-one-inbound", agentOne.email, "inbound", "buyer@example.com", JSON.stringify([agentOne.email]), "Private viewing", "Palm Jumeirah", "unread");
    insert.run("agent-one-draft", agentOne.email, "outbound", agentOne.email, JSON.stringify(["buyer@example.com"]), "Draft proposal", "Prepared for review", "draft");
    insert.run("agent-one-sent", agentOne.email, "outbound", agentOne.email, JSON.stringify(["buyer@example.com"]), "Sent proposal", "Delivered", "sent");
    insert.run("agent-two-inbound", agentTwo.email, "inbound", "private@example.com", JSON.stringify([agentTwo.email]), "Other agent", "Confidential", "unread");

    const drafts = await handleInboxRequest(request("/api/agent/inbox?folder=drafts"), env, agentOne) as Response;
    const draftPayload = await drafts.json() as {
      folder: string;
      counts: { inbox: number; unread: number; drafts: number; sent: number; archive: number; all: number };
      messages: Array<{ id: string }>;
    };
    assert.equal(drafts.status, 200);
    assert.equal(draftPayload.folder, "drafts");
    assert.deepEqual(draftPayload.messages.map((message) => message.id), ["agent-one-draft"]);
    assert.deepEqual(draftPayload.counts, { inbox: 1, unread: 1, drafts: 1, sent: 1, archive: 0, all: 3 });

    const search = await handleInboxRequest(request("/api/agent/inbox?folder=inbox&q=palm"), env, agentOne) as Response;
    const searchPayload = await search.json() as { messages: Array<{ id: string }> };
    assert.deepEqual(searchPayload.messages.map((message) => message.id), ["agent-one-inbound"]);
  } finally {
    sqlite.close();
  }
});
