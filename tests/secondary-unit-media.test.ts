import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { handleAgentRequest } from "../worker/agent-backend";
import { MAX_SECONDARY_UNIT_PHOTO_BYTES } from "../worker/secondary-unit-media";

const migrationDirectory = fileURLToPath(new URL("../drizzle-agent", import.meta.url));
const ownerEmail = "listing-owner@psrhomes.ae";
const otherEmail = "listing-other@psrhomes.ae";
const ownerUnitId = "11111111-1111-4111-8111-111111111111";
const ownerToken = "owner-listing-session-token-000000000001";
const otherToken = "other-listing-session-token-000000000002";
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const normalizedWebpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

function values(input: unknown[]): SQLInputValue[] {
  return input.map((value) => {
    if (value === undefined) throw new TypeError("Undefined cannot be bound to SQLite.");
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === null || ["string", "number", "bigint"].includes(typeof value)) return value as SQLInputValue;
    throw new TypeError(`Unsupported SQLite value: ${typeof value}`);
  });
}

function meta(changes = 0): D1Meta & Record<string, unknown> {
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: changes,
    last_row_id: 0,
    changed_db: changes > 0,
    changes,
  };
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

  prepare(query: string) {
    return new Statement(this.sqlite, query);
  }

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

  async exec(query: string) {
    this.sqlite.exec(query);
    return { count: 0, duration: 0 };
  }

  withSession(): D1DatabaseSession {
    throw new Error("D1 sessions are unnecessary here.");
  }

  async dump() {
    return new ArrayBuffer(0);
  }
}

type StoredR2Object = {
  bytes: Uint8Array;
  httpMetadata: R2HTTPMetadata;
  customMetadata: Record<string, string>;
};

class MemoryR2 {
  readonly objects = new Map<string, StoredR2Object>();
  readonly puts: string[] = [];
  readonly deletes: string[] = [];

  async put(key: string, body: ArrayBuffer | ArrayBufferView | Blob | string, options: R2PutOptions = {}) {
    let bytes: Uint8Array;
    if (typeof body === "string") bytes = new TextEncoder().encode(body);
    else if (body instanceof Blob) bytes = new Uint8Array(await body.arrayBuffer());
    else if (ArrayBuffer.isView(body)) bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength).slice();
    else bytes = new Uint8Array(body).slice();
    const httpMetadata = options.httpMetadata instanceof Headers ? {} : options.httpMetadata || {};
    this.objects.set(key, {
      bytes,
      httpMetadata,
      customMetadata: options.customMetadata || {},
    });
    this.puts.push(key);
    return this.object(key, false);
  }

  async get(key: string) {
    return this.objects.has(key) ? this.object(key, true) : null;
  }

  async head(key: string) {
    return this.objects.has(key) ? this.object(key, false) : null;
  }

  async delete(key: string | string[]) {
    for (const item of Array.isArray(key) ? key : [key]) {
      this.objects.delete(item);
      this.deletes.push(item);
    }
  }

  private object(key: string, includeBody: boolean) {
    const stored = this.objects.get(key);
    assert.ok(stored, `Expected R2 object ${key}`);
    const etag = `test-${key}`;
    const base = {
      key,
      version: "test-version",
      size: stored.bytes.byteLength,
      etag,
      httpEtag: `"${etag}"`,
      uploaded: new Date("2026-08-26T00:00:00.000Z"),
      httpMetadata: stored.httpMetadata,
      customMetadata: stored.customMetadata,
      range: undefined,
      checksums: {},
      storageClass: "Standard",
      writeHttpMetadata(headers: Headers) {
        if (stored.httpMetadata.contentType) headers.set("content-type", stored.httpMetadata.contentType);
        if (stored.httpMetadata.cacheControl) headers.set("cache-control", stored.httpMetadata.cacheControl);
        if (stored.httpMetadata.contentDisposition) headers.set("content-disposition", stored.httpMetadata.contentDisposition);
        if (stored.httpMetadata.contentEncoding) headers.set("content-encoding", stored.httpMetadata.contentEncoding);
        if (stored.httpMetadata.contentLanguage) headers.set("content-language", stored.httpMetadata.contentLanguage);
      },
    };
    if (!includeBody) return base as unknown as R2Object;
    const bytes = stored.bytes.slice();
    return {
      ...base,
      body: new Blob([bytes]).stream(),
      bodyUsed: false,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      text: async () => new TextDecoder().decode(bytes),
      json: async <T>() => JSON.parse(new TextDecoder().decode(bytes)) as T,
      blob: async () => new Blob([bytes], { type: stored.httpMetadata.contentType }),
    } as unknown as R2ObjectBody;
  }
}

class MemoryImages {
  readonly transforms: Array<Record<string, unknown>> = [];
  readonly outputs: Array<Record<string, unknown>> = [];

  async info() {
    return { format: "image/png", fileSize: pngBytes.byteLength, width: 3_000, height: 1_500 };
  }

  input() {
    const { transforms, outputs } = this;
    const transformer = {
      transform(options: Record<string, unknown>) {
        transforms.push(options);
        return transformer;
      },
      output(options: Record<string, unknown>) {
        outputs.push(options);
        return {
          response: () => new Response(normalizedWebpBytes, {
            headers: { "content-type": "image/webp" },
          }),
        };
      },
    };
    return transformer;
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const filename of readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(`${migrationDirectory}/${filename}`, "utf8"));
  }
  const insertProfile = sqlite.prepare(`INSERT INTO hg_agent_profiles
    (email, display_name, phone, title, avatar_url, role, active, team_name, access_json)
    VALUES (?, ?, '+971500000000', 'Property Consultant', '', 'agent', 1, 'Advisory',
      '["workspace","portfolio"]')`);
  insertProfile.run(ownerEmail, "Listing Owner");
  insertProfile.run(otherEmail, "Listing Other");
  sqlite.prepare(`INSERT INTO hg_agent_advisor_profiles
    (agent_email, portfolio_slug, portfolio_public, onboarding_complete)
    VALUES (?, ?, 0, 0)`).run(ownerEmail, "listing-owner");
  sqlite.prepare(`INSERT INTO hg_agent_advisor_profiles
    (agent_email, portfolio_slug, portfolio_public, onboarding_complete)
    VALUES (?, ?, 0, 1)`).run(otherEmail, "listing-other");
  sqlite.prepare(`INSERT INTO hg_agent_secondary_units
    (id, agent_email, title, community, emirate, property_type, bedrooms,
      bathrooms, size_sqft, price_aed, status, published)
    VALUES (?, ?, 'Marina residence', 'Dubai Marina', 'Dubai', 'Apartment', '2',
      2, 1200, 2500000, 'available', 0)`).run(ownerUnitId, ownerEmail);
  sqlite.prepare("INSERT INTO hg_agent_sessions (token_hash, email, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')")
    .run(await sha256(ownerToken), ownerEmail);
  sqlite.prepare("INSERT INTO hg_agent_sessions (token_hash, email, expires_at) VALUES (?, ?, '2099-01-01T00:00:00Z')")
    .run(await sha256(otherToken), otherEmail);
  const media = new MemoryR2();
  const images = new MemoryImages();
  const env = {
    DB: new Database(sqlite),
    MEDIA: media as unknown as R2Bucket,
    IMAGES: images as unknown as ImagesBinding,
  };
  return { sqlite, media, images, env };
}

function sessionHeaders(token: string, contentType?: string) {
  const headers = new Headers({
    origin: "https://psrhomes.ae",
    cookie: `psr_agent_session=${token}`,
  });
  if (contentType) headers.set("content-type", contentType);
  return headers;
}

function uploadRequest(unitId: string, token: string, file: File) {
  const form = new FormData();
  form.set("photo", file);
  return new Request(`https://psrhomes.ae/api/agent/secondary-units/${unitId}/photos`, {
    method: "POST",
    headers: sessionHeaders(token),
    body: form,
  });
}

function authenticatedRequest(path: string, token: string, method = "GET") {
  return new Request(`https://psrhomes.ae${path}`, {
    method,
    headers: sessionHeaders(token),
  });
}

async function uploadPhoto(
  env: Awaited<ReturnType<typeof setup>>["env"],
  name = "property.png",
) {
  const response = await handleAgentRequest(
    uploadRequest(ownerUnitId, ownerToken, new File([pngBytes], name, { type: "image/png" })),
    env as never,
  );
  assert.ok(response);
  assert.equal(response.status, 201, await response.clone().text());
  return (await response.json() as { photo: { id: string; url: string; filename: string; mimeType: string; sizeBytes: number; width: number; height: number } }).photo;
}

test("owner upload normalizes a property photo and returns it through the owner-scoped listing API", async () => {
  const { sqlite, media, images, env } = await setup();
  try {
    const photo = await uploadPhoto(env, "  Villa / Hero\n.PNG  ");
    assert.equal(photo.filename, "Villa - Hero-.PNG");
    assert.equal(photo.mimeType, "image/webp");
    assert.equal(photo.sizeBytes, normalizedWebpBytes.byteLength);
    assert.deepEqual({ width: photo.width, height: photo.height }, { width: 2400, height: 1200 });
    assert.equal(photo.url, `/api/agent/listing-media/${photo.id}`);
    assert.deepEqual(images.transforms, [{ width: 2400, height: 2400, fit: "scale-down" }]);
    assert.deepEqual(images.outputs, [{ format: "image/webp", quality: 84, anim: false }]);

    assert.equal(media.puts.length, 1);
    const stored = media.objects.get(media.puts[0]);
    assert.ok(stored);
    assert.equal(stored.httpMetadata.contentType, "image/webp");
    assert.equal(stored.customMetadata.owner, ownerEmail);
    assert.equal(stored.customMetadata.unitId, ownerUnitId);
    assert.equal(stored.customMetadata.originalFilename, "Villa - Hero-.PNG");

    const listResponse = await handleAgentRequest(
      authenticatedRequest("/api/agent/secondary-units", ownerToken),
      env as never,
    );
    assert.ok(listResponse);
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json() as {
      units: Array<{
        id: string;
        photos: Array<{
          id: string;
          url: string;
          filename: string;
          mimeType: string;
          sizeBytes: number;
          width: number;
          height: number;
          sortOrder: number;
          createdAt: string;
        }>;
      }>;
    };
    assert.equal(listed.units[0].id, ownerUnitId);
    assert.deepEqual(listed.units[0].photos, [{
      id: photo.id,
      url: photo.url,
      filename: "Villa - Hero-.PNG",
      mimeType: "image/webp",
      sizeBytes: normalizedWebpBytes.byteLength,
      width: 2400,
      height: 1200,
      sortOrder: 0,
      createdAt: listed.units[0].photos[0].createdAt,
    }]);
    assert.equal(Number((sqlite.prepare("SELECT COUNT(*) AS total FROM hg_agent_secondary_unit_media").get() as { total: number }).total), 1);
  } finally {
    sqlite.close();
  }
});

test("another agent cannot upload to, fetch, or delete the owner's private listing media", async () => {
  const { sqlite, env } = await setup();
  try {
    const crossUpload = await handleAgentRequest(
      uploadRequest(ownerUnitId, otherToken, new File([pngBytes], "cross-owner.png", { type: "image/png" })),
      env as never,
    );
    assert.ok(crossUpload);
    assert.equal(crossUpload.status, 404);
    assert.match((await crossUpload.json() as { error: string }).error, /not found/i);

    const photo = await uploadPhoto(env);
    const crossFetch = await handleAgentRequest(
      authenticatedRequest(`/api/agent/listing-media/${photo.id}`, otherToken),
      env as never,
    );
    assert.ok(crossFetch);
    assert.equal(crossFetch.status, 404);

    const crossDelete = await handleAgentRequest(
      authenticatedRequest(`/api/agent/secondary-units/${ownerUnitId}/photos/${photo.id}`, otherToken, "DELETE"),
      env as never,
    );
    assert.ok(crossDelete);
    assert.equal(crossDelete.status, 404);
    assert.equal(Number((sqlite.prepare("SELECT COUNT(*) AS total FROM hg_agent_secondary_unit_media").get() as { total: number }).total), 1);
  } finally {
    sqlite.close();
  }
});

test("draft media stays private and public media requires listing, portfolio, onboarding, and active-profile gates", async () => {
  const { sqlite, env } = await setup();
  try {
    const photo = await uploadPhoto(env);
    const path = `/api/agent/listing-media/${photo.id}`;

    const anonymousDraft = await handleAgentRequest(new Request(`https://psrhomes.ae${path}`), env as never);
    assert.ok(anonymousDraft);
    assert.equal(anonymousDraft.status, 401);

    const ownerDraft = await handleAgentRequest(authenticatedRequest(path, ownerToken), env as never);
    assert.ok(ownerDraft);
    assert.equal(ownerDraft.status, 200);
    assert.equal(ownerDraft.headers.get("cache-control"), "private, no-store");
    assert.equal(ownerDraft.headers.get("content-type"), "image/webp");
    assert.deepEqual(new Uint8Array(await ownerDraft.arrayBuffer()), normalizedWebpBytes);

    sqlite.prepare("UPDATE hg_agent_secondary_units SET published = 1 WHERE id = ?").run(ownerUnitId);
    const portfolioPrivate = await handleAgentRequest(new Request(`https://psrhomes.ae${path}`), env as never);
    assert.equal(portfolioPrivate?.status, 401);

    sqlite.prepare("UPDATE hg_agent_advisor_profiles SET portfolio_public = 1 WHERE agent_email = ?").run(ownerEmail);
    const onboardingIncomplete = await handleAgentRequest(new Request(`https://psrhomes.ae${path}`), env as never);
    assert.equal(onboardingIncomplete?.status, 401);

    sqlite.prepare("UPDATE hg_agent_advisor_profiles SET onboarding_complete = 1 WHERE agent_email = ?").run(ownerEmail);
    const publicPhoto = await handleAgentRequest(new Request(`https://psrhomes.ae${path}`), env as never);
    assert.ok(publicPhoto);
    assert.equal(publicPhoto.status, 200);
    assert.equal(publicPhoto.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=86400");
    assert.equal(publicPhoto.headers.get("x-content-type-options"), "nosniff");

    const publicHead = await handleAgentRequest(new Request(`https://psrhomes.ae${path}`, { method: "HEAD" }), env as never);
    assert.ok(publicHead);
    assert.equal(publicHead.status, 200);
    assert.equal(await publicHead.text(), "");

    sqlite.prepare("UPDATE hg_agent_profiles SET active = 0 WHERE email = ?").run(ownerEmail);
    const inactiveProfile = await handleAgentRequest(new Request(`https://psrhomes.ae${path}`), env as never);
    assert.equal(inactiveProfile?.status, 401);

    sqlite.prepare("UPDATE hg_agent_profiles SET active = 1 WHERE email = ?").run(ownerEmail);
    sqlite.prepare("UPDATE hg_agent_secondary_units SET published = 0 WHERE id = ?").run(ownerUnitId);
    const listingDraftAgain = await handleAgentRequest(new Request(`https://psrhomes.ae${path}`), env as never);
    assert.equal(listingDraftAgain?.status, 401);
  } finally {
    sqlite.close();
  }
});

test("MIME spoofing and files above the upload limit are rejected before storage", async () => {
  const { sqlite, media, images, env } = await setup();
  try {
    const spoofed = await handleAgentRequest(
      uploadRequest(ownerUnitId, ownerToken, new File([pngBytes], "spoofed.jpg", { type: "image/jpeg" })),
      env as never,
    );
    assert.ok(spoofed);
    assert.equal(spoofed.status, 415);
    assert.match((await spoofed.json() as { error: string }).error, /does not match/i);

    const oversizedBytes = new Uint8Array(MAX_SECONDARY_UNIT_PHOTO_BYTES + 1);
    oversizedBytes.set(pngBytes, 0);
    const oversized = await handleAgentRequest(
      uploadRequest(ownerUnitId, ownerToken, new File([oversizedBytes], "oversized.png", { type: "image/png" })),
      env as never,
    );
    assert.ok(oversized);
    assert.equal(oversized.status, 413);
    assert.match((await oversized.json() as { error: string }).error, /12 MB or smaller/i);
    assert.equal(media.objects.size, 0);
    assert.equal(images.transforms.length, 0);
  } finally {
    sqlite.close();
  }
});

test("photo deletion and owner unit deletion remove the corresponding private R2 objects", async () => {
  const { sqlite, media, env } = await setup();
  try {
    const first = await uploadPhoto(env, "first.png");
    const second = await uploadPhoto(env, "second.png");
    const keys = [...media.objects.keys()];
    assert.equal(keys.length, 2);

    const photoDelete = await handleAgentRequest(
      authenticatedRequest(`/api/agent/secondary-units/${ownerUnitId}/photos/${first.id}`, ownerToken, "DELETE"),
      env as never,
    );
    assert.ok(photoDelete);
    assert.equal(photoDelete.status, 200);
    assert.equal(media.objects.has(keys[0]), false);
    assert.equal(media.objects.has(keys[1]), true);
    assert.equal(Number((sqlite.prepare("SELECT COUNT(*) AS total FROM hg_agent_secondary_unit_media").get() as { total: number }).total), 1);

    const unitDelete = await handleAgentRequest(
      authenticatedRequest(`/api/agent/secondary-units/${ownerUnitId}`, ownerToken, "DELETE"),
      env as never,
    );
    assert.ok(unitDelete);
    assert.equal(unitDelete.status, 200);
    assert.equal(media.objects.size, 0);
    assert.deepEqual(new Set(media.deletes), new Set(keys));
    assert.equal(Number((sqlite.prepare("SELECT COUNT(*) AS total FROM hg_agent_secondary_units WHERE id = ?").get(ownerUnitId) as { total: number }).total), 0);
    assert.equal(Number((sqlite.prepare("SELECT COUNT(*) AS total FROM hg_agent_secondary_unit_media").get() as { total: number }).total), 0);
    assert.equal((await handleAgentRequest(new Request(`https://psrhomes.ae/api/agent/listing-media/${second.id}`), env as never))?.status, 404);
  } finally {
    sqlite.close();
  }
});
