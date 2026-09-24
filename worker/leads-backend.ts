import registryData from "../data/projects.json";
import { interpretSemanticSearch } from "./semantic-search";

const ACCESS_COOKIE = "hg_leads_session";
const SESSION_SECONDS = 12 * 60 * 60;
const MAX_JSON_BYTES = 4_096;
const MAX_LOGIN_ATTEMPTS = 5;
const PAGE_SIZE = 50;

type LeadsEnv = Env & {
  LEADS_ACCESS_CODE?: string;
  LEADS_SESSION_SECRET?: string;
};

type WorkerSubtleCrypto = SubtleCrypto & {
  timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean;
};

type LeadRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  property_reference: string | null;
  consent: number;
  status: string;
  created_at: string;
};

type LeadSummary = {
  total: number;
  last_24_hours: number;
  last_7_days: number;
  notified: number;
  notification_failed: number;
};

const projectNames = new Map(
  (registryData as { projects: Array<{ slug: string; name: string }> }).projects
    .map((project) => [project.slug, project.name]),
);

function appPath(pathname: string) {
  const decoded = pathname.replace(/^\/h%26g\/properties(?=\/|$)/i, "/h&g/properties");
  return decoded.startsWith("/h&g/properties")
    ? decoded.slice("/h&g/properties".length) || "/"
    : decoded;
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").trim().slice(0, max)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    throw new Error("Request body is too large.");
  }
  if (!request.body) return {};
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_JSON_BYTES) {
      await reader.cancel();
      throw new Error("Request body is too large.");
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  const parsed: unknown = body ? JSON.parse(body) : {};
  return isRecord(parsed) ? parsed : {};
}

async function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function constantTimeMatch(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);
  return (crypto.subtle as WorkerSubtleCrypto).timingSafeEqual(leftHash, rightHash);
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function sessionCookie(token: string) {
  return `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${ACCESS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

async function createSessionToken(secret: string) {
  const expires = Date.now() + SESSION_SECONDS * 1_000;
  const payload = `${expires}.${crypto.randomUUID().replaceAll("-", "")}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function hasValidLeadsSession(request: Request, env: LeadsEnv) {
  const secret = clean(env.LEADS_SESSION_SECRET, 512);
  const token = cookieValue(request, ACCESS_COOKIE);
  if (!secret || token.length < 90 || token.length > 220) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresValue, nonce, signature] = parts;
  const expires = Number(expiresValue);
  if (!Number.isFinite(expires) || expires <= Date.now() || expires > Date.now() + SESSION_SECONDS * 1_000) {
    return false;
  }
  if (!/^[a-f0-9]{32}$/i.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return constantTimeMatch(signature, await hmac(secret, `${expiresValue}.${nonce}`));
}

async function enforceLoginRateLimit(request: Request, env: LeadsEnv) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = `lead-dashboard:${hex(await sha256(ip))}`;
  const row = await env.DB.prepare(
    `INSERT INTO hg_agent_rate_limits ("key", window_started_at, "count")
     VALUES (?, CURRENT_TIMESTAMP, 1)
     ON CONFLICT("key") DO UPDATE SET
       "count" = CASE
         WHEN datetime(window_started_at, '+15 minutes') <= CURRENT_TIMESTAMP THEN 1
         ELSE "count" + 1
       END,
       window_started_at = CASE
         WHEN datetime(window_started_at, '+15 minutes') <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
         ELSE window_started_at
       END
     RETURNING "count"`,
  ).bind(key).first<{ count: number }>();
  return (row?.count ?? MAX_LOGIN_ATTEMPTS + 1) <= MAX_LOGIN_ATTEMPTS;
}

async function access(request: Request, env: LeadsEnv) {
  if (request.method === "GET") {
    return (await hasValidLeadsSession(request, env))
      ? json({ authenticated: true })
      : json({ authenticated: false }, 401);
  }
  if (!validOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  if (request.method === "DELETE") {
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!(await enforceLoginRateLimit(request, env))) {
    return json({ error: "Too many attempts. Please wait 15 minutes." }, 429);
  }
  const payload = await readJson(request);
  const code = clean(payload.code, 6);
  const expectedCode = clean(env.LEADS_ACCESS_CODE, 64);
  const sessionSecret = clean(env.LEADS_SESSION_SECRET, 512);
  if (!expectedCode || !sessionSecret) {
    return json({ error: "Lead dashboard access is temporarily unavailable." }, 503);
  }
  if (!/^\d{6}$/.test(code) || !(await constantTimeMatch(code, expectedCode))) {
    return json({ error: "The access code is incorrect." }, 401);
  }
  const token = await createSessionToken(sessionSecret);
  return json({ authenticated: true }, 200, { "set-cookie": sessionCookie(token) });
}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

async function dashboard(request: Request, env: LeadsEnv) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!(await hasValidLeadsSession(request, env))) return json({ error: "Lead access code required." }, 401);

  const url = new URL(request.url);
  const query = clean(url.searchParams.get("q"), 320);
  const searchIntent = await interpretSemanticSearch(query, "leads", env);
  const requestedStatus = clean(url.searchParams.get("status"), 40);
  const status = ["notified", "notification_failed", "new"].includes(requestedStatus)
    ? requestedStatus
    : "";
  const requestedPage = Number(url.searchParams.get("page") || "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, 10_000)
    : 1;
  const offset = (page - 1) * PAGE_SIZE;
  const effectiveStatus = status || searchIntent.status;
  const termClauses = searchIntent.terms.map(() => `(name LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR email LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR phone LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR property_reference LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR source LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR message LIKE ? ESCAPE '\\' COLLATE NOCASE)`);
  const termBindings = searchIntent.terms.flatMap((term) => {
    const pattern = likePattern(term);
    return [pattern, pattern, pattern, pattern, pattern, pattern];
  });
  const timeframeClause = searchIntent.timeframe === "today"
    ? "datetime(created_at) >= datetime('now', 'start of day')"
    : searchIntent.timeframe === "last_7_days"
      ? "datetime(created_at) >= datetime('now', '-7 days')"
      : searchIntent.timeframe === "last_30_days"
        ? "datetime(created_at) >= datetime('now', '-30 days')"
        : "";
  const whereParts = [
    ...termClauses,
    effectiveStatus ? "status = ?" : "",
    timeframeClause,
  ].filter(Boolean);
  const where = whereParts.length ? whereParts.join(" AND ") : "1 = 1";
  const queryBindings = [...termBindings, ...(effectiveStatus ? [effectiveStatus] : [])];

  const [leadResult, countRow, summaryRow] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, email, phone, message, source, property_reference, consent, status, created_at
       FROM haus_grace_leads
       WHERE ${where}
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT ? OFFSET ?`,
    ).bind(...queryBindings, PAGE_SIZE, offset).all<LeadRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM haus_grace_leads
       WHERE ${where}`,
    ).bind(...queryBindings).first<{ count: number }>(),
    env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN datetime(created_at) >= datetime('now', '-24 hours') THEN 1 ELSE 0 END) AS last_24_hours,
         SUM(CASE WHEN datetime(created_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS last_7_days,
         SUM(CASE WHEN status = 'notified' THEN 1 ELSE 0 END) AS notified,
         SUM(CASE WHEN status = 'notification_failed' THEN 1 ELSE 0 END) AS notification_failed
       FROM haus_grace_leads`,
    ).first<LeadSummary>(),
  ]);

  const total = Number(countRow?.count || 0);
  return json({
    leads: leadResult.results.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      source: lead.source,
      propertyReference: lead.property_reference || "",
      projectTitle: lead.property_reference
        ? projectNames.get(lead.property_reference) || lead.property_reference
        : "General enquiry",
      consent: Boolean(lead.consent),
      status: lead.status,
      createdAt: lead.created_at,
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    summary: {
      total: Number(summaryRow?.total || 0),
      last24Hours: Number(summaryRow?.last_24_hours || 0),
      last7Days: Number(summaryRow?.last_7_days || 0),
      notified: Number(summaryRow?.notified || 0),
      notificationFailed: Number(summaryRow?.notification_failed || 0),
    },
    searchIntent,
  });
}

export async function handleLeadsDashboardRequest(
  request: Request,
  env: LeadsEnv,
): Promise<Response | null> {
  const path = appPath(new URL(request.url).pathname);
  if (path === "/api/leads/access") {
    try {
      return await access(request, env);
    } catch (error) {
      console.error(JSON.stringify({
        event: "lead_dashboard_access_failed",
        message: error instanceof Error ? error.message.slice(0, 240) : "Unknown error",
      }));
      return json({ error: "Unable to complete the access request." }, 500);
    }
  }
  if (path === "/api/leads/dashboard") {
    try {
      return await dashboard(request, env);
    } catch (error) {
      console.error(JSON.stringify({
        event: "lead_dashboard_query_failed",
        message: error instanceof Error ? error.message.slice(0, 240) : "Unknown error",
      }));
      return json({ error: "Unable to load website leads." }, 500);
    }
  }
  return null;
}
