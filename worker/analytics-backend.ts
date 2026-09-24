import { hasValidLeadsSession } from "./leads-backend";

const MAX_JSON_BYTES = 32_768;
const MAX_BATCH_SIZE = 20;
const EVENT_TYPES = new Set([
  "page_view",
  "page_exit",
  "click",
  "section_view",
  "lead_submit",
  "chat_open",
]);
const PRIVATE_PATH_PREFIXES = ["/admin", "/analytics", "/leads", "/agent"];
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

type AnalyticsEnv = Env & {
  LEADS_SESSION_SECRET?: string;
};

type IncomingEvent = {
  sessionId: string;
  visitorId: string;
  eventType: string;
  path: string;
  section: string;
  target: string;
  xPct: number | null;
  yPct: number | null;
  scrollDepth: number;
  viewportWidth: number;
  viewportHeight: number;
  deviceType: string;
  referrerHost: string;
  durationSeconds: number;
};

function appPath(pathname: string) {
  const decoded = pathname.replace(/^\/h%26g\/properties(?=\/|$)/i, "/h&g/properties");
  return decoded.startsWith("/h&g/properties")
    ? decoded.slice("/h&g/properties".length) || "/"
    : decoded;
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedNumber(value: unknown, minimum: number, maximum: number, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

export function normalizeAnalyticsPath(value: unknown) {
  const path = clean(value, 180).split(/[?#]/, 1)[0];
  if (!path.startsWith("/") || path.startsWith("//")) return "";
  const normalized = appPath(path.replace(/\/{2,}/g, "/"));
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
}

export function isTrackableAnalyticsPath(path: string) {
  return Boolean(path) && !PRIVATE_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function safeHost(value: unknown) {
  const candidate = clean(value, 120).toLowerCase();
  if (!candidate) return "";
  try {
    const url = candidate.includes("://") ? new URL(candidate) : new URL(`https://${candidate}`);
    return /^[a-z0-9.-]+$/.test(url.hostname) ? url.hostname.slice(0, 120) : "";
  } catch {
    return "";
  }
}

export function normalizeAnalyticsEvent(value: unknown): IncomingEvent | null {
  if (!isRecord(value)) return null;
  const sessionId = clean(value.sessionId, 36);
  const visitorId = clean(value.visitorId, 36);
  const eventType = clean(value.eventType, 24);
  const path = normalizeAnalyticsPath(value.path);
  if (
    !UUID_PATTERN.test(sessionId)
    || !UUID_PATTERN.test(visitorId)
    || !EVENT_TYPES.has(eventType)
    || !isTrackableAnalyticsPath(path)
  ) return null;

  const hasPoint = eventType === "click"
    && Number.isFinite(Number(value.xPct))
    && Number.isFinite(Number(value.yPct));
  const deviceCandidate = clean(value.deviceType, 16).toLowerCase();
  return {
    sessionId,
    visitorId,
    eventType,
    path,
    section: clean(value.section, 80),
    target: clean(value.target, 100),
    xPct: hasPoint ? boundedNumber(value.xPct, 0, 100) : null,
    yPct: hasPoint ? boundedNumber(value.yPct, 0, 100) : null,
    scrollDepth: Math.round(boundedNumber(value.scrollDepth, 0, 100)),
    viewportWidth: Math.round(boundedNumber(value.viewportWidth, 0, 10_000)),
    viewportHeight: Math.round(boundedNumber(value.viewportHeight, 0, 10_000)),
    deviceType: ["mobile", "tablet", "desktop"].includes(deviceCandidate)
      ? deviceCandidate
      : "unknown",
    referrerHost: safeHost(value.referrerHost),
    durationSeconds: Math.round(boundedNumber(value.durationSeconds, 0, 21_600)),
  };
}

async function readJson(request: Request): Promise<unknown> {
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
  return body ? JSON.parse(body) as unknown : {};
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

async function sha256Hex(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function withinIngestRateLimit(request: Request, env: AnalyticsEnv) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = `site-analytics:${await sha256Hex(ip)}`;
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
  return (row?.count ?? 101) <= 100;
}

async function ingest(request: Request, env: AnalyticsEnv) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!validOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  if (!(await withinIngestRateLimit(request, env))) {
    return json({ error: "Analytics rate limit exceeded." }, 429);
  }
  const body = await readJson(request);
  const rawEvents = isRecord(body) && Array.isArray(body.events)
    ? body.events.slice(0, MAX_BATCH_SIZE)
    : [];
  const events = rawEvents
    .map(normalizeAnalyticsEvent)
    .filter((event): event is IncomingEvent => Boolean(event));
  if (!events.length) return json({ accepted: 0 }, 202);

  const country = clean((request.cf as { country?: string } | undefined)?.country, 2).toUpperCase();
  const statement = env.DB.prepare(
    `INSERT INTO hg_site_analytics_events (
       session_id, visitor_id, event_type, path, section, target,
       x_pct, y_pct, scroll_depth, viewport_width, viewport_height,
       device_type, referrer_host, country, duration_seconds
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  await env.DB.batch(events.map((event) => statement.bind(
    event.sessionId,
    event.visitorId,
    event.eventType,
    event.path,
    event.section,
    event.target,
    event.xPct,
    event.yPct,
    event.scrollDepth,
    event.viewportWidth,
    event.viewportHeight,
    event.deviceType,
    event.referrerHost,
    country,
    event.durationSeconds,
  )));
  return json({ accepted: events.length }, 202);
}

function rangeStart(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19).replace("T", " ");
}

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function dashboard(request: Request, env: AnalyticsEnv) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!(await hasValidLeadsSession(request, env))) {
    return json({ error: "Analytics access code required." }, 401);
  }

  const url = new URL(request.url);
  const requestedRange = Number(url.searchParams.get("range") || "30");
  const days = [7, 30, 90].includes(requestedRange) ? requestedRange : 30;
  const selectedPath = normalizeAnalyticsPath(url.searchParams.get("path") || "/") || "/";
  const since = rangeStart(days);

  type SummaryRow = {
    visits: number;
    visitors: number;
    page_views: number;
    clicks: number;
    conversions: number;
    avg_scroll: number;
    avg_engagement: number;
  };
  type CountRow = { label: string; count: number };
  type PageRow = CountRow & { visits: number; avg_scroll: number };
  type HeatRow = { x: number; y: number; count: number };
  type DayRow = { date: string; views: number; visits: number };
  type SectionRow = CountRow & { avg_scroll: number };
  type RecentRow = {
    session_id: string;
    first_seen: string;
    last_seen: string;
    pages: number;
    events: number;
    max_scroll: number;
    device_type: string;
    country: string;
    referrer_host: string;
    engagement_seconds: number;
  };

  const [
    summary,
    daily,
    pages,
    heatmap,
    devices,
    referrers,
    countries,
    sections,
    recent,
  ] = await Promise.all([
    env.DB.prepare(
      `SELECT
         COUNT(DISTINCT session_id) AS visits,
         COUNT(DISTINCT visitor_id) AS visitors,
         SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
         SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks,
         SUM(CASE WHEN event_type = 'lead_submit' THEN 1 ELSE 0 END) AS conversions,
         AVG(CASE WHEN event_type = 'page_exit' THEN scroll_depth END) AS avg_scroll,
         AVG(CASE WHEN event_type = 'page_exit' THEN duration_seconds END) AS avg_engagement
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?)`,
    ).bind(since).first<SummaryRow>(),
    env.DB.prepare(
      `SELECT date(created_at) AS date,
         SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS views,
         COUNT(DISTINCT session_id) AS visits
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?)
       GROUP BY date(created_at)
       ORDER BY date(created_at)`,
    ).bind(since).all<DayRow>(),
    env.DB.prepare(
      `SELECT path AS label,
         SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS count,
         COUNT(DISTINCT session_id) AS visits,
         AVG(CASE WHEN event_type = 'page_exit' THEN scroll_depth END) AS avg_scroll
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?)
       GROUP BY path
       HAVING count > 0
       ORDER BY count DESC, path
       LIMIT 30`,
    ).bind(since).all<PageRow>(),
    env.DB.prepare(
      `SELECT
         CAST(x_pct / 5 AS INTEGER) * 5 AS x,
         CAST(y_pct / 5 AS INTEGER) * 5 AS y,
         COUNT(*) AS count
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?)
         AND path = ?
         AND event_type = 'click'
         AND x_pct IS NOT NULL
         AND y_pct IS NOT NULL
       GROUP BY CAST(x_pct / 5 AS INTEGER), CAST(y_pct / 5 AS INTEGER)
       ORDER BY count DESC
       LIMIT 240`,
    ).bind(since, selectedPath).all<HeatRow>(),
    env.DB.prepare(
      `SELECT device_type AS label, COUNT(DISTINCT session_id) AS count
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?) AND event_type = 'page_view'
       GROUP BY device_type ORDER BY count DESC`,
    ).bind(since).all<CountRow>(),
    env.DB.prepare(
      `SELECT CASE WHEN referrer_host = '' THEN 'Direct' ELSE referrer_host END AS label,
         COUNT(DISTINCT session_id) AS count
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?) AND event_type = 'page_view'
       GROUP BY referrer_host ORDER BY count DESC LIMIT 10`,
    ).bind(since).all<CountRow>(),
    env.DB.prepare(
      `SELECT CASE WHEN country = '' THEN 'Unknown' ELSE country END AS label,
         COUNT(DISTINCT session_id) AS count
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?) AND event_type = 'page_view'
       GROUP BY country ORDER BY count DESC LIMIT 10`,
    ).bind(since).all<CountRow>(),
    env.DB.prepare(
      `SELECT section AS label, COUNT(DISTINCT session_id) AS count,
         AVG(scroll_depth) AS avg_scroll
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?)
         AND path = ?
         AND event_type = 'section_view'
         AND section != ''
       GROUP BY section ORDER BY count DESC LIMIT 16`,
    ).bind(since, selectedPath).all<SectionRow>(),
    env.DB.prepare(
      `SELECT session_id, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen,
         COUNT(DISTINCT path) AS pages, COUNT(*) AS events, MAX(scroll_depth) AS max_scroll,
         MAX(device_type) AS device_type, MAX(country) AS country,
         MAX(referrer_host) AS referrer_host,
         MAX(CASE WHEN event_type = 'page_exit' THEN duration_seconds ELSE 0 END) AS engagement_seconds
       FROM hg_site_analytics_events
       WHERE datetime(created_at) >= datetime(?)
       GROUP BY session_id
       ORDER BY datetime(last_seen) DESC
       LIMIT 20`,
    ).bind(since).all<RecentRow>(),
  ]);

  return json({
    range: days,
    selectedPath,
    summary: {
      visits: asNumber(summary?.visits),
      visitors: asNumber(summary?.visitors),
      pageViews: asNumber(summary?.page_views),
      clicks: asNumber(summary?.clicks),
      conversions: asNumber(summary?.conversions),
      averageScroll: Math.round(asNumber(summary?.avg_scroll)),
      averageEngagement: Math.round(asNumber(summary?.avg_engagement)),
    },
    daily: daily.results.map((row) => ({
      date: row.date,
      views: asNumber(row.views),
      visits: asNumber(row.visits),
    })),
    pages: pages.results.map((row) => ({
      path: row.label,
      views: asNumber(row.count),
      visits: asNumber(row.visits),
      averageScroll: Math.round(asNumber(row.avg_scroll)),
    })),
    heatmap: heatmap.results.map((row) => ({
      x: asNumber(row.x),
      y: asNumber(row.y),
      count: asNumber(row.count),
    })),
    devices: devices.results.map((row) => ({ label: row.label, count: asNumber(row.count) })),
    referrers: referrers.results.map((row) => ({ label: row.label, count: asNumber(row.count) })),
    countries: countries.results.map((row) => ({ label: row.label, count: asNumber(row.count) })),
    sections: sections.results.map((row) => ({
      label: row.label,
      visits: asNumber(row.count),
      averageScroll: Math.round(asNumber(row.avg_scroll)),
    })),
    recent: recent.results.map((row) => ({
      session: row.session_id.slice(0, 8),
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      pages: asNumber(row.pages),
      events: asNumber(row.events),
      maxScroll: asNumber(row.max_scroll),
      device: row.device_type || "unknown",
      country: row.country || "",
      referrer: row.referrer_host || "Direct",
      engagementSeconds: asNumber(row.engagement_seconds),
    })),
  });
}

export async function pruneAnalyticsData(env: AnalyticsEnv) {
  await env.DB.prepare(
    `DELETE FROM hg_site_analytics_events
     WHERE datetime(created_at) < datetime('now', '-13 months')`,
  ).run();
}

export async function handleAnalyticsRequest(
  request: Request,
  env: AnalyticsEnv,
): Promise<Response | null> {
  const path = appPath(new URL(request.url).pathname);
  try {
    if (path === "/api/analytics/events") return await ingest(request, env);
    if (path === "/api/analytics/dashboard") return await dashboard(request, env);
    return null;
  } catch (error) {
    console.error(JSON.stringify({
      event: "site_analytics_request_failed",
      path,
      message: error instanceof Error ? error.message.slice(0, 240) : "Unknown error",
    }));
    return json({
      error: path.endsWith("/dashboard")
        ? "Unable to load website analytics."
        : "Unable to record analytics.",
    }, 500);
  }
}
