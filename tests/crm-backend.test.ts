import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { handleCrmRequest, type CrmSession } from "../worker/crm-backend";

const migrationPaths = [
  "../drizzle-agent/0017_agent_crm.sql",
  "../drizzle-agent/0018_crm_contact_identity.sql",
  "../drizzle-agent/0019_crm_marketing_consent.sql",
].map((path) => fileURLToPath(new URL(path, import.meta.url)));

function meta(changes = 0, lastRowId = 0): D1Meta & Record<string, unknown> {
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: changes,
    last_row_id: lastRowId,
    changed_db: changes > 0,
    changes,
  };
}

function inputValues(values: unknown[]): SQLInputValue[] {
  return values.map((value) => {
    if (value === undefined) throw new TypeError("Undefined cannot be bound to SQLite.");
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
      return value;
    }
    throw new TypeError(`Unsupported SQLite test value: ${typeof value}`);
  });
}

class TestD1Statement implements D1PreparedStatement {
  private values: unknown[] = [];

  constructor(private readonly database: DatabaseSync, private readonly query: string) {}

  bind(...values: unknown[]): D1PreparedStatement {
    const statement = new TestD1Statement(this.database, this.query);
    statement.values = values;
    return statement;
  }

  first<T = unknown>(colName: string): Promise<T | null>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const row = this.database.prepare(this.query).get(...inputValues(this.values)) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (colName ? row[colName] : row) as T;
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const result = this.database.prepare(this.query).run(...inputValues(this.values));
    return {
      success: true,
      meta: meta(Number(result.changes), Number(result.lastInsertRowid || 0)),
      results: [],
    };
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const rows = this.database.prepare(this.query).all(...inputValues(this.values)) as T[];
    return { success: true, meta: meta(), results: rows };
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> {
    const statement = this.database.prepare(this.query);
    statement.setReturnArrays(true);
    const rows = statement.all(...inputValues(this.values)) as T[];
    if (!options?.columnNames) return rows;
    return [statement.columns().map((column) => column.name), ...rows];
  }
}

class TestD1Database implements D1Database {
  constructor(readonly sqlite: DatabaseSync) {}

  prepare(query: string): D1PreparedStatement {
    return new TestD1Statement(this.sqlite, query);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(query: string): Promise<D1ExecResult> {
    this.sqlite.exec(query);
    return { count: 0, duration: 0 };
  }

  withSession(): D1DatabaseSession {
    throw new Error("D1 sessions are not needed by the CRM tests.");
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }
}

function setup(mailCampaigns?: Fetcher, campaignDeliveryEnabled = "false", email?: SendEmail) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE hg_agent_profiles (
      email TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      title TEXT NOT NULL DEFAULT 'Property Advisor',
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE haus_grace_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'website',
      property_reference TEXT,
      consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  for (const migrationPath of migrationPaths) sqlite.exec(readFileSync(migrationPath, "utf8"));
  sqlite.prepare("INSERT INTO hg_agent_profiles (email, display_name, role, title) VALUES (?, ?, ?, ?)")
    .run("agent.one@psr.espacios.me", "Agent One", "agent", "Property Advisor");
  sqlite.prepare("INSERT INTO hg_agent_profiles (email, display_name, role, title) VALUES (?, ?, ?, ?)")
    .run("agent.two@psr.espacios.me", "Agent Two", "agent", "Property Advisor");
  sqlite.prepare("INSERT INTO hg_agent_profiles (email, display_name, role, title) VALUES (?, ?, ?, ?)")
    .run("admin@psr.espacios.me", "CRM Admin", "admin", "Administrator");
  return {
    sqlite,
    env: {
      DB: new TestD1Database(sqlite),
      CAMPAIGN_DELIVERY_ENABLED: campaignDeliveryEnabled,
      ...(mailCampaigns ? {
        MAIL_CAMPAIGNS: mailCampaigns,
        CRM_MAIL_SYNC_SECRET: "test-crm-mail-sync-secret",
      } : {}),
      ...(email ? { EMAIL: email } : {}),
    } as Parameters<typeof handleCrmRequest>[1],
  };
}

test("CRM campaign delivery kill switch blocks test and live sends before calling a sender", async () => {
  let senderCalls = 0;
  const mailCampaigns = {
    async fetch() {
      senderCalls += 1;
      return Response.json({ queued: true });
    },
  } as unknown as Fetcher;
  const { sqlite, env } = setup(mailCampaigns);
  try {
    const testSend = await handleCrmRequest(request("/api/agent/crm/campaigns/campaign-123/test", "POST", {}), env, admin) as Response;
    assert.equal(testSend.status, 503);
    assert.match((await responseBody<{ error: string }>(testSend)).error, /disabled/i);

    const liveSend = await handleCrmRequest(request("/api/agent/crm/campaigns/campaign-123/send", "POST", {
      confirmation: "SEND NOW",
    }), env, admin) as Response;
    assert.equal(liveSend.status, 503);
    assert.equal(senderCalls, 0);
  } finally {
    sqlite.close();
  }
});

test("CRM requires administrator approval before an enabled campaign can be queued", async () => {
  let senderCalls = 0;
  const mailCampaigns = {
    async fetch() {
      senderCalls += 1;
      return Response.json({ campaign: { id: "campaign-123" }, queued: true, eligibleRecipients: 1 });
    },
  } as unknown as Fetcher;
  const { sqlite, env } = setup(mailCampaigns, "true");
  try {
    const response = await handleCrmRequest(request("/api/agent/crm/campaigns/campaign-123/send", "POST", {
      confirmation: "SEND NOW",
    }), env, agentOne) as Response;
    assert.equal(response.status, 403);
    assert.match((await responseBody<{ error: string }>(response)).error, /administrator/i);
    assert.equal(senderCalls, 0);
  } finally {
    sqlite.close();
  }
});

const agentOne: CrmSession = { email: "agent.one@psr.espacios.me", name: "Agent One", role: "agent" };
const agentTwo: CrmSession = { email: "agent.two@psr.espacios.me", name: "Agent Two", role: "agent" };
const admin: CrmSession = { email: "admin@psr.espacios.me", name: "CRM Admin", role: "admin" };

function request(path: string, method = "GET", body?: Record<string, unknown>, origin = "https://psr.espacios.me") {
  return new Request(`https://psr.espacios.me${path}`, {
    method,
    headers: body ? { "content-type": "application/json", origin } : { origin },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function responseBody<T>(response: Response) {
  return await response.json() as T;
}

test("CRM project search exposes active catalogue choices for the Meta Leads workspace", async () => {
  const { sqlite, env } = setup();
  try {
    const response = await handleCrmRequest(request("/api/agent/crm/projects?q=wasl%20park%20gate"), env, agentOne) as Response;
    assert.equal(response.status, 200);
    const body = await responseBody<{ projects: Array<{ slug: string; name: string; developer: string }> }>(response);
    assert.ok(body.projects.some((project) => project.slug === "wasl1-park-gate-residences-dubai" && project.name === "Wasl 1 Park Gate Residences"));
    assert.ok(body.projects.every((project) => project.slug && project.name && project.developer));
  } finally {
    sqlite.close();
  }
});

test("CRM enforces ownership while allowing an administrator to inspect team records", async () => {
  const { sqlite, env } = setup();
  try {
    const created = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Aisha Rahman",
      email: "aisha@example.com",
      phone: "+971 50 123 4567",
      clientType: "investor",
      consentStatus: "granted",
      consentRecordedAt: "2026-08-08T10:00:00Z",
      consentSource: "Signed viewing registration",
      consentDetail: "Client agreed to receive relevant PSR property updates by email.",
      tags: ["Dubai", "Off-plan"],
    }), env, agentOne);
    assert.equal(created?.status, 201);
    const createdBody = await responseBody<{ contact: { id: string; ownerEmail: string; tags: string[] } }>(created as Response);
    assert.equal(createdBody.contact.ownerEmail, agentOne.email);
    assert.deepEqual(createdBody.contact.tags, ["Dubai", "Off-plan"]);

    const hidden = await handleCrmRequest(request(`/api/agent/crm/contacts/${createdBody.contact.id}`), env, agentTwo);
    assert.equal(hidden?.status, 404);

    const visibleToAdmin = await handleCrmRequest(request(`/api/agent/crm/contacts/${createdBody.contact.id}`), env, admin);
    assert.equal(visibleToAdmin?.status, 200);

    const badOrigin = await handleCrmRequest(request("/api/agent/crm/tasks", "POST", {
      contactId: createdBody.contact.id,
      title: "Call client",
    }, "https://attacker.example"), env, agentOne);
    assert.equal(badOrigin?.status, 403);
  } finally {
    sqlite.close();
  }
});

test("CRM BotSpace source filter keeps the advisor scope intact", async () => {
  const { sqlite, env } = setup();
  try {
    const botSpaceContact = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "BotSpace qualified lead",
      phone: "+971 50 777 0001",
      source: "botspace",
      status: "qualified",
    }), env, agentOne) as Response;
    assert.equal(botSpaceContact.status, 201);
    const botSpaceContactBody = await responseBody<{ contact: { id: string } }>(botSpaceContact);
    const botSpaceOpportunity = await handleCrmRequest(request("/api/agent/crm/opportunities", "POST", {
      contactId: botSpaceContactBody.contact.id,
      title: "BotSpace qualified lead — Avenue Park Towers II",
      stage: "qualified",
      kind: "purchase",
    }), env, agentOne) as Response;
    assert.equal(botSpaceOpportunity.status, 201);

    const manualContact = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Manual client",
      phone: "+971 50 777 0002",
      source: "manual",
    }), env, agentOne) as Response;
    assert.equal(manualContact.status, 201);

    const otherAdvisorLead = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Other advisor BotSpace lead",
      phone: "+971 50 777 0003",
      source: "botspace",
      status: "qualified",
    }), env, agentTwo) as Response;
    assert.equal(otherAdvisorLead.status, 201);

    const mine = await handleCrmRequest(request("/api/agent/crm/contacts?source=BotSpace"), env, agentOne) as Response;
    assert.equal(mine.status, 200);
    const mineBody = await responseBody<{ contacts: Array<{ fullName: string; source: string }>; total: number }>(mine);
    assert.equal(mineBody.total, 1);
    assert.deepEqual(mineBody.contacts.map((contact) => contact.fullName), ["BotSpace qualified lead"]);
    assert.equal(mineBody.contacts[0]?.source, "botspace");

    const pipeline = await handleCrmRequest(request("/api/agent/crm/opportunities?source=botspace"), env, agentOne) as Response;
    assert.equal(pipeline.status, 200);
    const pipelineBody = await responseBody<{ opportunities: Array<{ title: string }>; total: number }>(pipeline);
    assert.equal(pipelineBody.total, 1);
    assert.deepEqual(pipelineBody.opportunities.map((opportunity) => opportunity.title), ["BotSpace qualified lead — Avenue Park Towers II"]);

    const team = await handleCrmRequest(request("/api/agent/crm/contacts?source=botspace&scope=team"), env, admin) as Response;
    assert.equal(team.status, 200);
    const teamBody = await responseBody<{ contacts: Array<{ fullName: string }>; total: number }>(team);
    assert.equal(teamBody.total, 2);
    assert.deepEqual(new Set(teamBody.contacts.map((contact) => contact.fullName)), new Set([
      "BotSpace qualified lead",
      "Other advisor BotSpace lead",
    ]));
  } finally {
    sqlite.close();
  }
});

test("CRM lets a Meta Lead owner update private notes without changing lead ownership or source", async () => {
  const { sqlite, env } = setup();
  try {
    const created = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Meta Lead Notes",
      phone: "+971 50 777 0004",
      source: "botspace",
      notes: "Looking for a two-bedroom home.",
    }), env, agentOne) as Response;
    assert.equal(created.status, 201);
    const createdBody = await responseBody<{ contact: { id: string; ownerEmail: string; source: string } }>(created);

    const updated = await handleCrmRequest(request(`/api/agent/crm/contacts/${createdBody.contact.id}`, "PATCH", {
      notes: "Asked for the brochure and a call this afternoon.",
    }), env, agentOne) as Response;
    assert.equal(updated.status, 200);
    const updatedBody = await responseBody<{ contact: { ownerEmail: string; source: string; notes: string } }>(updated);
    assert.equal(updatedBody.contact.notes, "Asked for the brochure and a call this afternoon.");
    assert.equal(updatedBody.contact.ownerEmail, agentOne.email);
    assert.equal(updatedBody.contact.source, "botspace");

    const blocked = await handleCrmRequest(request(`/api/agent/crm/contacts/${createdBody.contact.id}`, "PATCH", {
      notes: "Another advisor should not be able to edit this.",
    }), env, agentTwo) as Response;
    assert.equal(blocked.status, 404);
  } finally {
    sqlite.close();
  }
});

test("CRM opens legacy 32-character Meta Lead identifiers", async () => {
  const { sqlite, env } = setup();
  try {
    const legacyId = "f62dcd535bc7bdd77f895ac1780b745d";
    sqlite.prepare(
      "INSERT INTO hg_crm_contacts (id, owner_email, created_by, full_name, phone, source) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(legacyId, agentOne.email, agentOne.email, "Legacy Meta Lead", "+971 50 777 0008", "botspace");

    const opened = await handleCrmRequest(request(`/api/agent/crm/contacts/${legacyId}`), env, agentOne) as Response;
    assert.equal(opened.status, 200);
    const openedBody = await responseBody<{ contact: { id: string; fullName: string } }>(opened);
    assert.equal(openedBody.contact.id, legacyId);
    assert.equal(openedBody.contact.fullName, "Legacy Meta Lead");
  } finally {
    sqlite.close();
  }
});

test("CRM delivers an owner-scoped client project email and records it on the lead timeline", async () => {
  const deliveries: unknown[] = [];
  const email = {
    async send(message: unknown) {
      deliveries.push(message);
    },
  } as unknown as SendEmail;
  const { sqlite, env } = setup(undefined, "false", email);
  try {
    const created = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Project Email Client",
      email: "client@example.com",
      phone: "+971 50 777 0005",
      source: "botspace",
      status: "qualified",
    }), env, agentOne) as Response;
    assert.equal(created.status, 201);
    const { contact } = await responseBody<{ contact: { id: string } }>(created);

    const sent = await handleCrmRequest(request(`/api/agent/crm/contacts/${contact.id}/email`, "POST", {
      subject: "Wasl 1 Park Gate Residences | PSR Homes",
      message: "As discussed, here are the project details for your review.",
      projectSlug: "wasl1-park-gate-residences-dubai",
    }), env, agentOne) as Response;
    assert.equal(sent.status, 200);
    assert.equal(deliveries.length, 1);
    const delivery = deliveries[0] as { to: string; subject: string; text: string; html: string };
    assert.equal(delivery.to, "client@example.com");
    assert.equal(delivery.subject, "Wasl 1 Park Gate Residences | PSR Homes");
    assert.match(delivery.text, /View Wasl 1 Park Gate Residences/);
    assert.match(delivery.html, /View Wasl 1 Park Gate Residences/);

    const detail = await handleCrmRequest(request(`/api/agent/crm/contacts/${contact.id}`), env, agentOne) as Response;
    assert.equal(detail.status, 200);
    const detailBody = await responseBody<{ activities: Array<{ type: string; subject: string; body: string }> }>(detail);
    assert.ok(detailBody.activities.some((activity) => activity.type === "email" && activity.subject.includes("Wasl 1 Park Gate") && activity.body.includes("client@example.com")));

    const blocked = await handleCrmRequest(request(`/api/agent/crm/contacts/${contact.id}/email`, "POST", {
      subject: "This should not send",
      message: "Another advisor must not be able to send this.",
    }), env, agentTwo) as Response;
    assert.equal(blocked.status, 404);
    assert.equal(deliveries.length, 1);
  } finally {
    sqlite.close();
  }
});

test("CRM limits a single-client campaign draft to the consented selected lead", async () => {
  const forwarded: Array<Record<string, unknown>> = [];
  const mailCampaigns = {
    async fetch(input: unknown, init?: RequestInit) {
      const outbound = input instanceof Request ? input : new Request(String(input), init);
      forwarded.push(await outbound.json() as Record<string, unknown>);
      return Response.json({
        campaign: { id: "campaign-single-client" },
        imported: 1,
        blocked: 0,
        validationQueued: 1,
        studioUrl: "https://mail.example.test/campaign-single-client",
      });
    },
  } as unknown as Fetcher;
  const { sqlite, env } = setup(mailCampaigns);
  try {
    const consent = {
      consentStatus: "granted",
      consentRecordedAt: "2026-08-12T10:00:00Z",
      consentSource: "Signed property update request",
      consentDetail: "Client agreed to receive PSR project updates by email.",
    };
    const target = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Selected Campaign Client",
      email: "selected@example.com",
      phone: "+971 50 777 0006",
      ...consent,
    }), env, agentOne) as Response;
    assert.equal(target.status, 201);
    const targetBody = await responseBody<{ contact: { id: string } }>(target);
    const other = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Other Consented Client",
      email: "other@example.com",
      phone: "+971 50 777 0007",
      ...consent,
    }), env, agentOne) as Response;
    assert.equal(other.status, 201);

    const created = await handleCrmRequest(request("/api/agent/crm/campaigns", "POST", {
      campaignName: "Park Gate selected client update",
      subject: "Park Gate availability update",
      message: "A personalised Park Gate update for your review.",
      contactId: targetBody.contact.id,
    }), env, agentOne) as Response;
    assert.equal(created.status, 201);
    assert.equal(forwarded.length, 1);
    const payload = forwarded[0];
    const contacts = payload.contacts as Array<{ crmContactId: string; email: string }>;
    assert.deepEqual(contacts, [{
      crmContactId: targetBody.contact.id,
      email: "selected@example.com",
      fullName: "Selected Campaign Client",
      consentRecordedAt: "2026-08-12T10:00:00.000Z",
      consentSource: "Signed property update request",
      consentDetail: "Client agreed to receive PSR project updates by email.",
    }]);
    assert.deepEqual(payload.audienceFilter, { status: "", tag: "", contactId: targetBody.contact.id });
  } finally {
    sqlite.close();
  }
});

test("CRM manages an opportunity, follow-up task, activity timeline and soft archive", async () => {
  const { sqlite, env } = setup();
  try {
    const contactResponse = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Omar Saleh",
      phone: "+971 55 111 2233",
      status: "qualified",
    }), env, agentOne) as Response;
    const contact = await responseBody<{ contact: { id: string } }>(contactResponse);

    const opportunityResponse = await handleCrmRequest(request("/api/agent/crm/opportunities", "POST", {
      contactId: contact.contact.id,
      title: "Archive by Imtiaz purchase",
      kind: "purchase",
      stage: "qualified",
      estimatedValueAed: 1_200_000,
      probability: 40,
      projectSlug: "the-archive-by-imtiaz",
      budgetMinAed: 900_000,
      budgetMaxAed: 1_400_000,
    }), env, agentOne) as Response;
    assert.equal(opportunityResponse.status, 201);
    const opportunity = await responseBody<{ opportunity: { id: string } }>(opportunityResponse);

    const taskResponse = await handleCrmRequest(request("/api/agent/crm/tasks", "POST", {
      contactId: contact.contact.id,
      opportunityId: opportunity.opportunity.id,
      title: "Arrange project presentation",
      priority: "high",
      dueAt: "2030-01-02T08:00:00Z",
    }), env, agentOne) as Response;
    assert.equal(taskResponse.status, 201);
    const task = await responseBody<{ task: { id: string } }>(taskResponse);

    const completed = await handleCrmRequest(request(`/api/agent/crm/tasks/${task.task.id}`, "PATCH", {
      status: "completed",
    }), env, agentOne) as Response;
    assert.equal(completed.status, 200);
    const completedBody = await responseBody<{ task: { status: string; completedAt: string } }>(completed);
    assert.equal(completedBody.task.status, "completed");
    assert.ok(completedBody.task.completedAt);

    const overview = await handleCrmRequest(request("/api/agent/crm/overview"), env, agentOne) as Response;
    const overviewBody = await responseBody<{ pipelineTotals: { openCount: number; openValueAed: number }; tasks: { open: number } }>(overview);
    assert.equal(overviewBody.pipelineTotals.openCount, 1);
    assert.equal(overviewBody.pipelineTotals.openValueAed, 1_200_000);
    assert.equal(overviewBody.tasks.open, 0);

    const archived = await handleCrmRequest(request(`/api/agent/crm/contacts/${contact.contact.id}`, "DELETE"), env, agentOne) as Response;
    const archivedBody = await responseBody<{
      contact: { status: string };
      opportunities: Array<{ stage: string }>;
      activities: Array<{ type: string }>;
    }>(archived);
    assert.equal(archivedBody.contact.status, "archived");
    assert.equal(archivedBody.opportunities[0]?.stage, "archived");
    assert.ok(archivedBody.activities.some((activity) => activity.type === "task_completed"));
  } finally {
    sqlite.close();
  }
});

test("CRM imports a consented website lead exactly once and creates its first opportunity", async () => {
  const { sqlite, env } = setup();
  try {
    const lead = sqlite.prepare(
      `INSERT INTO haus_grace_leads
        (name, email, phone, message, source, property_reference, consent)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ).run(
      "Layla Hassan",
      "layla@example.com",
      "+971 50 999 0000",
      "Interested in a two-bedroom investment.",
      "grace-chat",
      "the-archive-by-imtiaz",
    );
    const leadId = Number(lead.lastInsertRowid);
    const blockedAgentImport = await handleCrmRequest(request("/api/agent/crm/import-lead", "POST", {
      leadId,
    }), env, agentOne) as Response;
    assert.equal(blockedAgentImport.status, 403);

    const imported = await handleCrmRequest(request("/api/agent/crm/import-lead", "POST", {
      leadId,
      ownerEmail: agentOne.email,
      nextFollowUpAt: "2030-02-01T09:00:00Z",
    }), env, admin) as Response;
    assert.equal(imported.status, 201);
    const importedBody = await responseBody<{
      imported: boolean;
      contact: { source: string; consentStatus: string };
      opportunities: Array<{ projectSlug: string }>;
      websiteLeads: Array<{ id: number }>;
    }>(imported);
    assert.equal(importedBody.imported, true);
    assert.equal(importedBody.contact.source, "website:grace-chat");
    assert.equal(importedBody.contact.consentStatus, "granted");
    assert.equal(importedBody.opportunities[0]?.projectSlug, "the-archive-by-imtiaz");
    assert.equal(importedBody.websiteLeads[0]?.id, leadId);

    const repeated = await handleCrmRequest(request("/api/agent/crm/import-lead", "POST", { leadId }), env, admin) as Response;
    assert.equal(repeated.status, 200);
    const repeatedBody = await responseBody<{ imported: boolean; alreadyImported: boolean; opportunities: unknown[] }>(repeated);
    assert.equal(repeatedBody.imported, false);
    assert.equal(repeatedBody.alreadyImported, true);
    assert.equal(repeatedBody.opportunities.length, 1);

    const linkCount = sqlite.prepare("SELECT COUNT(*) AS count FROM hg_crm_lead_links").get() as { count: number };
    const auditCount = sqlite.prepare("SELECT COUNT(*) AS count FROM hg_crm_audit_log").get() as { count: number };
    assert.equal(linkCount.count, 1);
    assert.ok(auditCount.count >= 1);
  } finally {
    sqlite.close();
  }
});

test("CRM synchronizes consent withdrawal before changing a campaign-linked contact", async () => {
  const syncCalls: Array<Record<string, unknown>> = [];
  const mailCampaigns = {
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      const request = new Request(input, init);
      syncCalls.push(await request.json() as Record<string, unknown>);
      return Response.json({ ok: true, changed: true, state: "withdrawn" });
    },
  } as unknown as Fetcher;
  const { sqlite, env } = setup(mailCampaigns);
  try {
    const created = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Maya Karim",
      email: "maya@example.com",
      consentStatus: "granted",
      consentRecordedAt: "2026-08-08T10:00:00Z",
      consentSource: "Signed consultation form",
      consentDetail: "Client explicitly agreed to receive relevant property updates by email.",
    }), env, agentOne) as Response;
    const createdBody = await responseBody<{ contact: { id: string } }>(created);
    const updated = await handleCrmRequest(request(`/api/agent/crm/contacts/${createdBody.contact.id}`, "PATCH", {
      consentStatus: "withdrawn",
    }), env, agentOne) as Response;
    assert.equal(updated.status, 200);
    assert.equal(syncCalls.length, 1);
    assert.deepEqual(syncCalls[0], {
      actorEmail: agentOne.email,
      actorRole: "agent",
      agentEmail: agentOne.email,
      crmContactId: createdBody.contact.id,
      email: "maya@example.com",
      state: "withdrawn",
      reason: "Marketing consent withdrawn in the advisor CRM",
    });
    const stored = sqlite.prepare("SELECT consent_status FROM hg_crm_contacts WHERE id=?")
      .get(createdBody.contact.id) as { consent_status: string };
    assert.equal(stored.consent_status, "withdrawn");
  } finally {
    sqlite.close();
  }
});

test("CRM leaves consent unchanged when the delivery service cannot revoke a campaign audience", async () => {
  const mailCampaigns = {
    async fetch() {
      return Response.json({ ok: false, error: "Temporary bridge failure" }, { status: 503 });
    },
  } as unknown as Fetcher;
  const { sqlite, env } = setup(mailCampaigns);
  try {
    const created = await handleCrmRequest(request("/api/agent/crm/contacts", "POST", {
      fullName: "Noor Ali",
      email: "noor@example.com",
      consentStatus: "granted",
      consentRecordedAt: "2026-08-08T10:00:00Z",
      consentSource: "Signed consultation form",
      consentDetail: "Client explicitly agreed to receive relevant property updates by email.",
    }), env, agentOne) as Response;
    const createdBody = await responseBody<{ contact: { id: string } }>(created);
    const failed = await handleCrmRequest(request(`/api/agent/crm/contacts/${createdBody.contact.id}`, "PATCH", {
      consentStatus: "withdrawn",
    }), env, agentOne) as Response;
    assert.equal(failed.status, 503);
    const stored = sqlite.prepare("SELECT consent_status FROM hg_crm_contacts WHERE id=?")
      .get(createdBody.contact.id) as { consent_status: string };
    assert.equal(stored.consent_status, "granted");
  } finally {
    sqlite.close();
  }
});
