import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getDocument,
  listDocuments,
  setDocumentLibrary,
  type AgentEnv,
  type AgentSession,
} from "../worker/agent-backend";

const baseMigrationPath = fileURLToPath(new URL("../drizzle-agent/0000_agent_workspace.sql", import.meta.url));
const libraryMigrationPath = fileURLToPath(new URL("../drizzle-agent/0025_psr_document_libraries.sql", import.meta.url));

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

function session(email: string, name: string, role = "agent"): AgentSession {
  return {
    email,
    name,
    role,
    phone: "+971500000000",
    title: "Property Consultant",
    avatarUrl: "",
    expiresAt: "2099-01-01T00:00:00.000Z",
    mustChangePassword: false,
    onboardingRequired: false,
    teamName: "Advisory",
    access: ["documents"],
  };
}

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(baseMigrationPath, "utf8"));
  const insertProfile = sqlite.prepare("INSERT INTO hg_agent_profiles (email, display_name, role) VALUES (?, ?, 'agent')");
  insertProfile.run("one@psrhomes.ae", "Agent One");
  insertProfile.run("two@psrhomes.ae", "Agent Two");
  const insertDocument = sqlite.prepare(`INSERT INTO hg_agent_documents
    (id, agent_email, type, title, client_name, content_json, status)
    VALUES (?, ?, 'proposal', ?, 'Private client', '{}', 'draft')`);
  insertDocument.run("one-private", "one@psrhomes.ae", "Agent One private");
  insertDocument.run("two-private", "two@psrhomes.ae", "Agent Two private");
  sqlite.exec(readFileSync(libraryMigrationPath, "utf8"));
  sqlite.prepare("UPDATE hg_agent_documents SET library = 'office' WHERE id = 'two-private'").run();
  const env = { DB: new Database(sqlite), MEDIA: {} as R2Bucket } as unknown as AgentEnv;
  return { sqlite, env };
}

const agentOne = session("one@psrhomes.ae", "Agent One");
const agentTwo = session("two@psrhomes.ae", "Agent Two");

test("document library migration keeps every existing file personal", () => {
  const { sqlite } = setup();
  try {
    const row = sqlite.prepare("SELECT library FROM hg_agent_documents WHERE id = 'one-private'").get() as { library: string };
    assert.equal(row.library, "personal");
  } finally {
    sqlite.close();
  }
});

test("agents list their own personal files and shared office files only", async () => {
  const { sqlite, env } = setup();
  try {
    const rows = await listDocuments(env, agentOne) as Array<{ id: string; library: string }>;
    assert.deepEqual(new Set(rows.map((row) => row.id)), new Set(["one-private", "two-private"]));
    assert.equal(rows.find((row) => row.id === "one-private")?.library, "personal");
    assert.equal(rows.find((row) => row.id === "two-private")?.library, "office");
    const hidden = await getDocument(env, agentOne, "two-hidden");
    assert.equal(hidden, null);
  } finally {
    sqlite.close();
  }
});

test("office files are readable by colleagues but personal files are owner-only", async () => {
  const { sqlite, env } = setup();
  try {
    assert.equal(await getDocument(env, agentTwo, "one-private"), null);
    const shared = await getDocument(env, agentOne, "two-private");
    assert.equal(shared?.library, "office");
    assert.equal(shared?.agent_email, agentTwo.email);
  } finally {
    sqlite.close();
  }
});

test("only the owner can move a file between Personal and Office libraries", async () => {
  const { sqlite, env } = setup();
  try {
    const ownerRequest = new Request("https://psrhomes.ae/api/agent/documents/one-private/library", {
      method: "PATCH",
      headers: { origin: "https://psrhomes.ae", "content-type": "application/json" },
      body: JSON.stringify({ library: "office" }),
    });
    const ownerResponse = await setDocumentLibrary(ownerRequest, env, agentOne, "one-private");
    assert.equal(ownerResponse.status, 200);
    assert.equal((await getDocument(env, agentTwo, "one-private"))?.library, "office");

    const colleagueRequest = new Request("https://psrhomes.ae/api/agent/documents/one-private/library", {
      method: "PATCH",
      headers: { origin: "https://psrhomes.ae", "content-type": "application/json" },
      body: JSON.stringify({ library: "personal" }),
    });
    const colleagueResponse = await setDocumentLibrary(colleagueRequest, env, agentTwo, "one-private");
    assert.equal(colleagueResponse.status, 403);
    assert.equal((await getDocument(env, agentTwo, "one-private"))?.library, "office");
  } finally {
    sqlite.close();
  }
});
