import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createAdminUser, deleteAdminUser, handleAgentRequest, updateAdminUser, type AgentEnv, type AgentSession } from "../worker/agent-backend";
import type { PublishMarketDataInput, PublishMarketObservation } from "../worker/live-market-data";

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
    this.sqlite.exec("BEGIN");
    try {
      for (const statement of statements) output.push(await statement.run<T>());
      this.sqlite.exec("COMMIT");
      return output;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  async exec(query: string) { this.sqlite.exec(query); return { count: 0, duration: 0 }; }
  withSession(): D1DatabaseSession { throw new Error("D1 sessions are unnecessary here."); }
  async dump() { return new ArrayBuffer(0); }
}

const migrationDirectory = fileURLToPath(new URL("../drizzle-agent", import.meta.url));
const oldEmail = "rename-source@psrhomes.ae";
const newEmail = "rename-target@psrhomes.ae";

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const filename of readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(`${migrationDirectory}/${filename}`, "utf8"));
  }
  sqlite.prepare(`INSERT INTO hg_agent_profiles
    (email, display_name, phone, title, avatar_url, role, active, team_name, access_json)
    VALUES (?, 'Rename Source', '+971500000000', 'Property Consultant', '/api/agent/avatar/rename-source', 'agent', 1, 'Advisory', '["workspace","crm","inbox","research","portfolio","documents"]')`).run(oldEmail);
  sqlite.prepare(`INSERT INTO hg_agent_credentials
    (email, username, password_hash, password_salt, password_iterations, must_change_password)
    VALUES (?, 'rename-source', 'hash', 'salt', 100000, 0)`).run(oldEmail);
  sqlite.prepare("INSERT INTO hg_agent_sessions (token_hash, email, expires_at) VALUES ('rename-session', ?, '2099-01-01T00:00:00Z')").run(oldEmail);
  sqlite.prepare("INSERT INTO hg_agent_login_codes (email, nonce, code_hash, expires_at) VALUES (?, 'nonce', 'code', '2099-01-01T00:00:00Z')").run(oldEmail);
  sqlite.prepare("INSERT INTO hg_agent_advisor_profiles (agent_email, portfolio_slug, onboarding_complete) VALUES (?, 'rename-source', 1)").run(oldEmail);
  sqlite.prepare(`INSERT INTO hg_agent_secondary_units
    (id, agent_email, title, community, property_type, bedrooms)
    VALUES ('rename-unit', ?, 'Private unit', 'Dubai Marina', 'Apartment', '2')`).run(oldEmail);
  sqlite.prepare(`INSERT INTO hg_agent_property_finder_listings
    (id, agent_email, external_id, external_url, title, location, property_type, listing_type)
    VALUES ('rename-listing', ?, 'pf-1', 'https://example.com/pf-1', 'PF listing', 'Dubai', 'Apartment', 'sale')`).run(oldEmail);
  sqlite.prepare("INSERT INTO hg_agent_property_finder_sync (agent_email, profile_url) VALUES (?, 'https://www.propertyfinder.ae/en/agent/test-1')").run(oldEmail);
  sqlite.prepare("INSERT INTO hg_agent_conversations (id, agent_email, title) VALUES ('rename-conversation', ?, 'Private chat')").run(oldEmail);
  sqlite.prepare(`INSERT INTO hg_agent_documents
    (id, agent_email, type, title, client_name, content_json, status)
    VALUES ('rename-document', ?, 'proposal', 'Private proposal', 'Client', ?, 'draft')`).run(oldEmail, JSON.stringify({ advisor: { email: oldEmail } }));
  sqlite.prepare(`INSERT INTO hg_crm_contacts
    (id, owner_email, created_by, full_name, email)
    VALUES ('rename-contact', ?, ?, 'Private Client', 'client@example.com')`).run(oldEmail, oldEmail);
  sqlite.prepare("INSERT INTO hg_crm_opportunities (id, contact_id, owner_email, title) VALUES ('rename-opportunity', 'rename-contact', ?, 'Purchase')").run(oldEmail);
  sqlite.prepare("INSERT INTO hg_crm_tasks (id, contact_id, owner_email, assigned_by, title) VALUES ('rename-task', 'rename-contact', ?, ?, 'Follow up')").run(oldEmail, oldEmail);
  sqlite.prepare(`INSERT INTO hg_crm_activities
    (id, contact_id, owner_email, actor_email, type, subject)
    VALUES ('rename-activity', 'rename-contact', ?, ?, 'note', 'Private note')`).run(oldEmail, oldEmail);
  sqlite.prepare(`INSERT INTO hg_crm_audit_log
    (id, actor_email, owner_email, action, entity_type, entity_id)
    VALUES ('rename-crm-audit', ?, ?, 'created', 'contact', 'rename-contact')`).run(oldEmail, oldEmail);
  sqlite.prepare(`INSERT INTO hg_crm_campaign_events
    (id, campaign_id, owner_email, actor_email, action)
    VALUES ('rename-campaign-event', 'campaign-1', ?, ?, 'created')`).run(oldEmail, oldEmail);
  sqlite.prepare(`INSERT INTO psr_inbox_messages
    (id, mailbox, direction, sender, recipients_json, subject, text_body, message_id, status)
    VALUES ('55555555-5555-4555-8555-555555555555', ?, 'outbound', ?, '["client@example.com"]', 'Private mail', 'Message', '<rename@example.com>', 'sent')`).run(oldEmail, oldEmail);
  const env = {
    DB: new Database(sqlite),
    MEDIA: {} as R2Bucket,
  } as unknown as AgentEnv;
  return { sqlite, env };
}

const administrator: AgentSession = {
  email: "admin@psrhomes.ae",
  name: "PSR Administrator",
  role: "admin",
  phone: "",
  title: "Administrator",
  avatarUrl: "",
  expiresAt: "2099-01-01T00:00:00.000Z",
  mustChangePassword: false,
  onboardingRequired: false,
  teamName: "Leadership",
  access: ["workspace", "crm", "inbox", "research", "portfolio", "documents"],
};

function updateRequest(targetEmail = newEmail) {
  return new Request("https://psrhomes.ae/api/agent/admin/users", {
    method: "PATCH",
    headers: { origin: "https://psrhomes.ae", "content-type": "application/json" },
    body: JSON.stringify({
      email: oldEmail,
      newEmail: targetEmail,
      name: "Rename Complete",
      phone: "+971511111111",
      title: "Senior Property Consultant",
      teamName: "Sales",
      access: ["workspace", "crm", "inbox"],
    }),
  });
}

function createRequest(email: string) {
  return new Request("https://psrhomes.ae/api/agent/admin/users", {
    method: "POST",
    headers: { origin: "https://psrhomes.ae", "content-type": "application/json" },
    body: JSON.stringify({
      email,
      name: "New Staff Member",
      title: "Property Consultant",
      teamName: "Advisory",
      temporaryPassword: "123456",
      access: ["workspace", "crm", "inbox"],
    }),
  });
}

function requiredRow(sqlite: DatabaseSync, query: string, ...bindings: SQLInputValue[]) {
  const row = sqlite.prepare(query).get(...bindings) as Record<string, unknown> | undefined;
  assert.ok(row, `Expected a row for: ${query}`);
  return row;
}

function rowCount(sqlite: DatabaseSync, query: string, ...bindings: SQLInputValue[]) {
  return Number(requiredRow(sqlite, query, ...bindings).count || 0);
}

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

async function derivedPassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const passwordSalt = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: passwordSalt, iterations }, material, 32 * 8));
}

async function sha256Hex(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const marketDataEndpoint = "https://psrhomes.ae/api/agent/admin/market-data";

function marketDataPayload(): PublishMarketDataInput {
  return {
    source: {
      id: "market-http-source-v1",
      key: "market-http-source",
      version: 1,
      publisher: "Dubai Land Department",
      label: "HTTP integration market snapshot",
      canonicalUrl: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
      type: "government",
      jurisdiction: "UAE",
      publishedAt: "2026-09-05T08:00:00.000Z",
      checkedAt: "2026-09-06T08:00:00.000Z",
      metadata: { cadence: "daily", transport: "admin-api" },
    },
    observations: [
      {
        id: "market-http-dubai-price-v1",
        seriesKey: "dubai:price_per_sqft:all",
        version: 1,
        metricKey: "price_per_sqft",
        scope: { type: "emirate", key: "dubai", label: "Dubai" },
        value: { numeric: 2_075, unit: "AED/sqft", currencyCode: "AED" },
        period: {
          start: "2026-09-01T00:00:00.000Z",
          end: "2026-09-04T23:59:59.000Z",
        },
        observedAt: "2026-09-05T07:00:00.000Z",
        publishedAt: "2026-09-05T08:00:00.000Z",
        validFrom: "2026-09-05T08:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        freshUntil: "2026-09-10T00:00:00.000Z",
        recentUntil: "2026-10-01T00:00:00.000Z",
        referenceUntil: "2026-12-31T23:59:59.000Z",
        sourceRecordId: "dubai-market-http-1",
        evidenceUrl: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
        provenanceNote: "Published aggregate used without unit-level inference.",
        methodology: "Daily published residential aggregate.",
        metadata: { sampleSize: 12_500 },
      },
      {
        id: "market-http-abu-dhabi-transactions-v1",
        seriesKey: "abu-dhabi:transaction_count:all",
        version: 1,
        metricKey: "transaction_count",
        scope: { type: "emirate", key: "abu-dhabi", label: "Abu Dhabi" },
        value: { numeric: 3_400, unit: "transactions" },
        observedAt: "2026-09-05T07:00:00.000Z",
        publishedAt: "2026-09-05T08:00:00.000Z",
        validFrom: "2026-09-05T08:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        freshUntil: "2026-09-10T00:00:00.000Z",
        recentUntil: "2026-10-01T00:00:00.000Z",
        referenceUntil: "2026-12-31T23:59:59.000Z",
        sourceRecordId: "abu-dhabi-market-http-1",
        metadata: { reportingWindow: "month-to-date" },
      },
    ],
  };
}

function marketDataRequest(
  cookie: string,
  options: { method?: "GET" | "POST"; origin?: string; payload?: PublishMarketDataInput; url?: string } = {},
) {
  const method = options.method ?? "POST";
  const headers = new Headers({ cookie });
  if (options.origin !== undefined) headers.set("origin", options.origin);
  if (method === "POST") headers.set("content-type", "application/json");
  return new Request(options.url ?? marketDataEndpoint, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(options.payload ?? marketDataPayload()) : undefined,
  });
}

async function adminCookies(sqlite: DatabaseSync, env: AgentEnv, unlock: boolean) {
  const sessionToken = "market-data-admin-session-token-that-is-long-enough";
  const accessCode = "market-data-admin-access";
  sqlite.prepare("INSERT INTO hg_agent_sessions (token_hash, email, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')")
    .run(await sha256Hex(sessionToken), administrator.email);
  env.AGENT_ADMIN_ACCESS_CODE_HASH = await sha256Hex(accessCode);
  const sessionCookie = `psr_agent_session=${sessionToken}`;
  if (!unlock) return sessionCookie;

  const response = await handleAgentRequest(new Request("https://psrhomes.ae/api/agent/admin/unlock", {
    method: "POST",
    headers: {
      origin: "https://psrhomes.ae",
      "content-type": "application/json",
      cookie: sessionCookie,
    },
    body: JSON.stringify({ code: accessCode }),
  }), env);
  assert.ok(response);
  assert.equal(response.status, 200);
  const unlockCookie = /(?:^|,\s*)(psr_admin_unlock=[^;]+)/.exec(response.headers.get("set-cookie") || "")?.[1];
  assert.ok(unlockCookie, "Expected the unlock endpoint to set the admin unlock cookie.");
  return `${sessionCookie}; ${unlockCookie}`;
}

test("staff migrations present Parv as leadership without elevating account authorization", () => {
  const { sqlite } = setup();
  try {
    const profile = requiredRow(
      sqlite,
      "SELECT title, team_name, role, access_json FROM hg_agent_profiles WHERE email = ?",
      "parv@psrhomes.ae",
    );
    assert.equal(profile.title, "Managing Partner");
    assert.equal(profile.team_name, "Leadership");
    assert.equal(profile.role, "agent");
    assert.equal(profile.access_json, '["workspace","crm","inbox","research","portfolio","documents"]');
  } finally {
    sqlite.close();
  }
});

test("admin email edit rekeys every operational owner without rewriting provenance", async () => {
  const { sqlite, env } = setup();
  try {
    const response = await updateAdminUser(updateRequest(), env, administrator);
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { emailChanged: boolean }).emailChanged, true);

    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_profiles WHERE email = ?", oldEmail), 0);
    const profile = sqlite.prepare("SELECT display_name, phone, title, team_name FROM hg_agent_profiles WHERE email = ?").get(newEmail) as Record<string, unknown>;
    assert.deepEqual({ ...profile }, { display_name: "Rename Complete", phone: "+971511111111", title: "Senior Property Consultant", team_name: "Sales" });
    const credential = sqlite.prepare("SELECT email, username FROM hg_agent_credentials WHERE email = ?").get(newEmail) as Record<string, unknown>;
    assert.deepEqual({ ...credential }, { email: newEmail, username: "rename-target" });
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_sessions WHERE email IN (?, ?)", oldEmail, newEmail), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_login_codes WHERE email IN (?, ?)", oldEmail, newEmail), 0);

    for (const [table, column] of [
      ["hg_agent_advisor_profiles", "agent_email"],
      ["hg_agent_secondary_units", "agent_email"],
      ["hg_agent_property_finder_listings", "agent_email"],
      ["hg_agent_property_finder_sync", "agent_email"],
      ["hg_agent_conversations", "agent_email"],
      ["hg_agent_documents", "agent_email"],
      ["hg_crm_contacts", "owner_email"],
      ["hg_crm_opportunities", "owner_email"],
      ["hg_crm_tasks", "owner_email"],
      ["hg_crm_activities", "owner_email"],
      ["hg_crm_audit_log", "owner_email"],
      ["hg_crm_campaign_events", "owner_email"],
      ["psr_inbox_messages", "mailbox"],
    ]) {
      assert.equal(rowCount(sqlite, `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`, newEmail), 1, `${table}.${column}`);
      assert.equal(rowCount(sqlite, `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`, oldEmail), 0, `${table}.${column} old identity`);
    }

    const document = sqlite.prepare("SELECT content_json FROM hg_agent_documents WHERE id = 'rename-document'").get() as { content_json: string };
    assert.equal(JSON.parse(document.content_json).advisor.email, newEmail);
    assert.equal(requiredRow(sqlite, "SELECT created_by FROM hg_crm_contacts WHERE id = 'rename-contact'").created_by, oldEmail);
    assert.equal(requiredRow(sqlite, "SELECT actor_email FROM hg_crm_activities WHERE id = 'rename-activity'").actor_email, oldEmail);
    assert.equal(requiredRow(sqlite, "SELECT sender FROM psr_inbox_messages WHERE id = '55555555-5555-4555-8555-555555555555'").sender, oldEmail);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_admin_audit WHERE action = 'email_renamed' AND target_email = ?", newEmail), 1);
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("admin email edit accepts a new canonical address without a deployment-time allowlist", async () => {
  const { sqlite, env } = setup();
  try {
    const dynamicEmail = "new-cloudflare-identity@psrhomes.ae";
    const response = await updateAdminUser(updateRequest(dynamicEmail), env, administrator);
    assert.equal(response.status, 200);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_profiles WHERE email = ?", oldEmail), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_profiles WHERE email = ? AND active = 1", dynamicEmail), 1);
  } finally {
    sqlite.close();
  }
});

test("admin account creation immediately creates the active Cloudflare D1 identity", async () => {
  const { sqlite, env } = setup();
  try {
    const dynamicEmail = "new-cloudflare-identity@psrhomes.ae";
    const response = await createAdminUser(createRequest(dynamicEmail), env, administrator);
    assert.equal(response.status, 201);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_profiles WHERE email = ? AND active = 1", dynamicEmail), 1);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_credentials WHERE email = ? AND must_change_password = 1", dynamicEmail), 1);
  } finally {
    sqlite.close();
  }
});

test("admin account creation enables the D1-backed mailbox with temporary access", async () => {
  const { sqlite, env } = setup();
  try {
    const response = await createAdminUser(createRequest(newEmail), env, administrator);
    assert.equal(response.status, 201);
    const body = await response.json() as { user: { email: string; mustChangePassword: boolean; hasPassword: boolean } };
    assert.equal(body.user.email, newEmail);
    assert.equal(body.user.hasPassword, true);
    assert.equal(body.user.mustChangePassword, true);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_credentials WHERE email = ? AND must_change_password = 1", newEmail), 1);
  } finally {
    sqlite.close();
  }
});

test("the signed-in administrator can unlock account controls with the normal account password", async () => {
  const { sqlite, env } = setup();
  try {
    const password = "PrivateAdmin123";
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100_000;
    const hash = await derivedPassword(password, salt, iterations);
    const sessionToken = "admin-session-token-that-is-long-enough-for-the-cookie";
    sqlite.prepare("UPDATE hg_agent_profiles SET role = 'admin', active = 1 WHERE email = ?").run(administrator.email);
    sqlite.prepare(`INSERT OR REPLACE INTO hg_agent_credentials
      (email, username, password_hash, password_salt, password_iterations, must_change_password)
      VALUES (?, 'admin', ?, ?, ?, 0)`).run(administrator.email, base64Url(hash), base64Url(salt), iterations);
    sqlite.prepare("INSERT INTO hg_agent_sessions (token_hash, email, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')")
      .run(await sha256Hex(sessionToken), administrator.email);
    env.AGENT_ADMIN_ACCESS_CODE_HASH = await sha256Hex("legacy-admin-access-code");

    const response = await handleAgentRequest(new Request("https://psrhomes.ae/api/agent/admin/unlock", {
      method: "POST",
      headers: {
        origin: "https://psrhomes.ae",
        "content-type": "application/json",
        cookie: `psr_agent_session=${sessionToken}`,
      },
      body: JSON.stringify({ code: password }),
    }), env);

    assert.ok(response);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") || "", /psr_admin_unlock=/);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_admin_audit WHERE action = 'admin_unlocked' AND target_email = ?", administrator.email), 1);
  } finally {
    sqlite.close();
  }
});

test("market-data administration rejects a signed-in but locked administrator", async () => {
  const { sqlite, env } = setup();
  try {
    const cookie = await adminCookies(sqlite, env, false);
    const response = await handleAgentRequest(marketDataRequest(cookie, { method: "GET" }), env);

    assert.ok(response);
    assert.equal(response.status, 403);
    assert.match((await response.json() as { error: string }).error, /administrator access code/i);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_data_sources"), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_observations"), 0);
  } finally {
    sqlite.close();
  }
});

test("market-data publishing rejects cross-origin requests without writing a snapshot", async () => {
  const { sqlite, env } = setup();
  try {
    const cookie = await adminCookies(sqlite, env, true);
    const response = await handleAgentRequest(marketDataRequest(cookie, {
      origin: "https://attacker.example",
    }), env);

    assert.ok(response);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Invalid request origin." });
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_data_sources"), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_observations"), 0);
  } finally {
    sqlite.close();
  }
});

test("an unlocked administrator can publish a versioned market snapshot to D1", async () => {
  const { sqlite, env } = setup();
  try {
    const cookie = await adminCookies(sqlite, env, true);
    const response = await handleAgentRequest(marketDataRequest(cookie, {
      origin: "https://psrhomes.ae",
    }), env);

    assert.ok(response);
    assert.equal(response.status, 201);
    const body = await response.json() as {
      snapshot: { source: { id: string; key: string; version: number }; insertedCount: number; observations: Array<{ id: string }> };
    };
    assert.deepEqual(body.snapshot.source, {
      ...body.snapshot.source,
      id: "market-http-source-v1",
      key: "market-http-source",
      version: 1,
    });
    assert.equal(body.snapshot.insertedCount, 2);
    assert.deepEqual(body.snapshot.observations.map((observation) => observation.id), [
      "market-http-dubai-price-v1",
      "market-http-abu-dhabi-transactions-v1",
    ]);

    const source = requiredRow(
      sqlite,
      "SELECT source_key, version, publisher, canonical_url, source_type FROM psr_market_data_sources WHERE id = ?",
      "market-http-source-v1",
    );
    assert.deepEqual({ ...source }, {
      source_key: "market-http-source",
      version: 1,
      publisher: "Dubai Land Department",
      canonical_url: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
      source_type: "government",
    });
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_observations WHERE source_id = ? AND status = 'published'", "market-http-source-v1"), 2);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_admin_audit WHERE action = 'market_data_snapshot_published' AND admin_email = ?", administrator.email), 1);
  } finally {
    sqlite.close();
  }
});

test("market-data GET filters a published snapshot by strict scopes and metrics", async () => {
  const { sqlite, env } = setup();
  try {
    const cookie = await adminCookies(sqlite, env, true);
    const publishResponse = await handleAgentRequest(marketDataRequest(cookie, {
      origin: "https://psrhomes.ae",
    }), env);
    assert.ok(publishResponse);
    assert.equal(publishResponse.status, 201);

    const url = new URL(marketDataEndpoint);
    url.searchParams.append("scope", "emirate:dubai");
    url.searchParams.append("scope", "emirate:abu-dhabi");
    url.searchParams.append("metric", "price_per_sqft");
    url.searchParams.set("limit", "5");
    url.searchParams.set("asOf", "2026-09-06T12:00:00.000Z");
    const response = await handleAgentRequest(marketDataRequest(cookie, {
      method: "GET",
      url: url.toString(),
    }), env);

    assert.ok(response);
    assert.equal(response.status, 200);
    const body = await response.json() as {
      retrievedAt: string;
      asOf: string;
      scopes: Array<{ type: string; key: string }>;
      observations: Array<{
        id: string;
        metricKey: string;
        scope: { type: string; key: string };
        scopePriority: number;
        value: { numeric: number | null };
      }>;
    };
    assert.equal(body.asOf, "2026-09-06T12:00:00.000Z");
    assert.ok(Number.isFinite(Date.parse(body.retrievedAt)));
    assert.deepEqual(body.scopes, [
      { type: "emirate", key: "dubai" },
      { type: "emirate", key: "abu-dhabi" },
    ]);
    assert.equal(body.observations.length, 1);
    assert.deepEqual(body.observations[0], {
      ...body.observations[0],
      id: "market-http-dubai-price-v1",
      metricKey: "price_per_sqft",
      scope: { ...body.observations[0].scope, type: "emirate", key: "dubai" },
      scopePriority: 0,
      value: { ...body.observations[0].value, numeric: 2_075 },
    });
  } finally {
    sqlite.close();
  }
});

test("market-data publishing reports structured validation errors without persistence", async () => {
  const { sqlite, env } = setup();
  try {
    const cookie = await adminCookies(sqlite, env, true);
    const payload = marketDataPayload();
    payload.source = { ...payload.source, canonicalUrl: "http://example.test/not-secure" };
    const response = await handleAgentRequest(marketDataRequest(cookie, {
      origin: "https://psrhomes.ae",
      payload,
    }), env);

    assert.ok(response);
    assert.equal(response.status, 400);
    const body = await response.json() as { error: string; code: string; field: string };
    assert.equal(body.code, "INVALID_MARKET_DATA");
    assert.equal(body.field, "source.canonicalUrl");
    assert.match(body.error, /HTTPS URL/i);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_data_sources"), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_observations"), 0);
  } finally {
    sqlite.close();
  }
});

test("duplicate market revisions return conflict and roll back every new row", async () => {
  const { sqlite, env } = setup();
  try {
    const cookie = await adminCookies(sqlite, env, true);
    const firstPayload = marketDataPayload();
    const firstResponse = await handleAgentRequest(marketDataRequest(cookie, {
      origin: "https://psrhomes.ae",
      payload: firstPayload,
    }), env);
    assert.ok(firstResponse);
    assert.equal(firstResponse.status, 201);

    const uniqueObservation: PublishMarketObservation = {
      ...structuredClone(firstPayload.observations[0]),
      id: "market-http-project-yield-v1",
      seriesKey: "project-one:gross-yield:all",
      metricKey: "gross_yield",
      scope: { type: "project", key: "project-one", label: "Project One" },
      value: { numeric: 6.2, unit: "%" },
    };
    const conflictingPayload: PublishMarketDataInput = {
      source: {
        ...firstPayload.source,
        id: "market-http-source-v2",
        version: 2,
      },
      observations: [
        uniqueObservation,
        structuredClone(firstPayload.observations[0]),
      ],
    };
    const response = await handleAgentRequest(marketDataRequest(cookie, {
      origin: "https://psrhomes.ae",
      payload: conflictingPayload,
    }), env);

    assert.ok(response);
    assert.equal(response.status, 409);
    assert.match((await response.json() as { error: string }).error, /already been published/i);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_data_sources"), 1);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_observations"), 2);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_data_sources WHERE id = 'market-http-source-v2'"), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_market_observations WHERE id = 'market-http-project-yield-v1'"), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_admin_audit WHERE action = 'market_data_snapshot_published'"), 1);
  } finally {
    sqlite.close();
  }
});

test("market-data GET rejects malformed scopes and non-integer or out-of-range limits", async () => {
  const { sqlite, env } = setup();
  try {
    const cookie = await adminCookies(sqlite, env, true);
    for (const query of [
      "scope=emirate%3ADubai",
      "scope=emirate%3A",
      "limit=1.5",
      "limit=0",
      "limit=81",
      "limit=",
    ]) {
      const response = await handleAgentRequest(marketDataRequest(cookie, {
        method: "GET",
        url: `${marketDataEndpoint}?${query}`,
      }), env);
      assert.ok(response);
      assert.equal(response.status, 400, query);
      assert.match((await response.json() as { error: string }).error, /scope\[0\]|limit/i, query);
    }
  } finally {
    sqlite.close();
  }
});

test("admin suspension revokes sessions and disables the D1 identity", async () => {
  const { sqlite, env } = setup();
  try {
    const response = await updateAdminUser(new Request("https://psrhomes.ae/api/agent/admin/users", {
      method: "PATCH",
      headers: { origin: "https://psrhomes.ae", "content-type": "application/json" },
      body: JSON.stringify({ email: oldEmail, active: false }),
    }), env, administrator);
    assert.equal(response.status, 200);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_profiles WHERE email = ? AND active = 0", oldEmail), 1);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_sessions WHERE email = ?", oldEmail), 0);
  } finally {
    sqlite.close();
  }
});

test("admin deletion removes private workspace data and preserves business records under the administrator", async () => {
  const { sqlite, env } = setup();
  try {
    const response = await deleteAdminUser(new Request(`https://psrhomes.ae/api/agent/admin/users/${encodeURIComponent(oldEmail)}`, {
      method: "DELETE",
      headers: { origin: "https://psrhomes.ae" },
    }), env, administrator, oldEmail);
    assert.equal(response.status, 200);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_profiles WHERE email = ?", oldEmail), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_documents WHERE agent_email = ?", oldEmail), 0);
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM psr_inbox_messages WHERE mailbox = ?", oldEmail), 0);
    for (const table of ["hg_crm_contacts", "hg_crm_opportunities", "hg_crm_tasks", "hg_crm_activities", "hg_crm_audit_log", "hg_crm_campaign_events"]) {
      assert.equal(rowCount(sqlite, `SELECT COUNT(*) AS count FROM ${table} WHERE owner_email = ?`, administrator.email), 1, table);
    }
    assert.equal(rowCount(sqlite, "SELECT COUNT(*) AS count FROM hg_agent_admin_audit WHERE action = 'user_deleted' AND target_email = ?", oldEmail), 1);
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});
