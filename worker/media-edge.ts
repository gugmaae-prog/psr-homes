import mediaManifest from "../data/r2-external-media-map.json";

type MediaManifest = {
  version: number;
  bucket: string;
  prefix: string;
  generatedAt: string;
  objectCount: number;
  sourceCount: number;
  sources: Record<string, string>;
};

type ResolvedMedia = {
  key: string;
  source: string;
};

const manifest = mediaManifest as MediaManifest;
const MAX_REWRITE_BYTES = 4 * 1024 * 1024;
const MAX_WRITE_THROUGH_BYTES = 20 * 1024 * 1024;
const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
const MEDIA_PATH = /^\/media\/external\/(?:source\/([A-Za-z0-9_-]+)|([a-f0-9]{16}))\/?$/;
const EXTERNAL_URL = /https:(?:(?:\\\/)|\/){2}(?:(?:\\\/)|(?:\\u0026)|[^\s"'<>\\)])+/gi;
const IMAGE_PATH = /\.(?:avif|gif|jpe?g|png|webp)$/i;

const TRUSTED_MEDIA_HOSTS = new Set([
  "asset.aldar.com",
  "belgravia-square.ellingtonproperties.ae",
  "beyonddevelopments.ae",
  "binghattiweb.imgix.net",
  "cdn.opr.ae",
  "creekharbourproperties.com",
  "d8j0ntlcm91z4.cloudfront.net",
  "ellingtonproperties.ae",
  "haus-grace-assets.thekeifferjapeth.workers.dev",
  "i.1.creatium.io",
  "img1.creatium.ru",
  "img2.creatium.ru",
  "img3.creatium.ru",
  "mira.static.bigapp.ae",
  "mirabellaproperties.com",
  "modon.com",
  "new-projects-media.propertyfinder.com",
  "rakproperties.ae",
  "reportagegroup.com",
  "reportageuae.com",
  "szr2.crimsoncapedigital.com",
  "uae-cms.emaar.com",
  "www.emaar.com",
  "www.modon.com",
  "www.rakproperties.ae",
  "www.reportagegroup.com",
]);

const INSIGHT_MEDIA = new Map([
  ["https://cdn.opr.ae/upload/photo/10.jpeg", "/media/insights/price-per-square-foot-uae-property-guide-2026"],
  ["https://cdn.opr.ae/upload/photo/DWTN%20Residences.jpg", "/media/insights/uae-mortgage-planning-before-reservation"],
  ["https://cdn.opr.ae/upload/photo/Downtown%20Dubai.jpg", "/media/insights/benefits-of-investing-in-uae-real-estate"],
  ["https://cdn.opr.ae/upload/photo/20.jpg", "/media/insights/how-to-evaluate-new-property-launches-uae"],
  ["https://cdn.opr.ae/upload/photo/business-bay.jpg", "/media/insights/monthly-uae-market-tracking-dashboard"],
  ["https://cdn.opr.ae/upload/photo/Palace%20Residences%20Hillside%207.webp", "/media/insights/service-charges-net-yield-uae-property"],
]);

const LEGACY_SOURCE_TO_ID = new Map(Object.entries(manifest.sources));
const LEGACY_ID_TO_SOURCE = new Map([...LEGACY_SOURCE_TO_ID].map(([source, id]) => [id, source]));
const LEGACY_PATH_TO_ID = new Map<string, string | null>();
for (const [source, id] of LEGACY_SOURCE_TO_ID) {
  const withoutSearch = new URL(source);
  withoutSearch.search = "";
  const key = withoutSearch.href;
  if (!LEGACY_PATH_TO_ID.has(key)) {
    LEGACY_PATH_TO_ID.set(key, id);
  } else if (LEGACY_PATH_TO_ID.get(key) !== id) {
    LEGACY_PATH_TO_ID.set(key, null);
  }
}

function logError(event: string, error: unknown, details: Record<string, string> = {}) {
  console.error(JSON.stringify({
    event,
    message: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
    ...details,
  }));
}

function defaultCache() {
  if (typeof caches === "undefined") return null;
  return (caches as CacheStorage & { default?: Cache }).default || null;
}

function canonicalMediaSource(value: string) {
  const candidate = value.trim().replaceAll("&amp;", "&").replace(/\\u0026/gi, "&");
  if (!candidate || candidate.length > 2_048 || /[\u0000-\u001f\u007f]/.test(candidate)) return "";
  let url: URL;
  try { url = new URL(candidate); } catch { return ""; }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return "";
  if (!TRUSTED_MEDIA_HOSTS.has(url.hostname.toLowerCase()) || !IMAGE_PATH.test(url.pathname)) return "";
  url.hash = "";
  return url.href;
}

function encodeSource(source: string) {
  const bytes = new TextEncoder().encode(source);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8_192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8_192));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeSource(token: string) {
  try {
    const padded = token.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return canonicalMediaSource(new TextDecoder().decode(bytes));
  } catch {
    return "";
  }
}

function legacyIdForSource(source: string) {
  const exact = LEGACY_SOURCE_TO_ID.get(source);
  if (exact) return exact;
  const withoutSearch = new URL(source);
  withoutSearch.search = "";
  return LEGACY_PATH_TO_ID.get(withoutSearch.href) || "";
}

export function mediaRouteForSource(value: string) {
  const source = canonicalMediaSource(value);
  if (!source) return "";
  const insight = INSIGHT_MEDIA.get(source);
  if (insight) return insight;
  const legacyId = legacyIdForSource(source);
  return legacyId ? `/media/external/${legacyId}` : `/media/external/source/${encodeSource(source)}`;
}

export function sourceFromMediaPath(pathname: string) {
  const match = pathname.match(MEDIA_PATH);
  if (!match) return "";
  return match[1] ? decodeSource(match[1]) : LEGACY_ID_TO_SOURCE.get(match[2]) || "";
}

export function rewriteExternalMediaUrls(source: string) {
  return source.replace(EXTERNAL_URL, (candidate) => {
    const normalized = candidate.replace(/\\\//g, "/").replace(/\\u0026/gi, "&");
    return mediaRouteForSource(normalized) || candidate;
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function resolveMedia(pathname: string): Promise<ResolvedMedia | null> {
  const match = pathname.match(MEDIA_PATH);
  if (!match) return null;
  if (match[2]) {
    return { key: `external/${match[2]}`, source: LEGACY_ID_TO_SOURCE.get(match[2]) || "" };
  }
  const source = decodeSource(match[1]);
  if (!source) return { key: "", source: "" };
  return { key: `external/v2/${await sha256Hex(source)}`, source };
}

function cacheKey(request: Request) {
  const url = new URL(request.url);
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

function hasConditionalHeaders(request: Request) {
  return ["if-match", "if-none-match", "if-modified-since", "if-unmodified-since"].some((name) => request.headers.has(name));
}

function mediaHeaders(object: R2Object, mode = "r2-edge") {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", MEDIA_CACHE_CONTROL);
  headers.set("etag", object.httpEtag);
  headers.set("last-modified", object.uploaded.toUTCString());
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-psr-media", mode);
  headers.set("x-psr-r2-key", object.key);
  return headers;
}

function conditionalHeadStatus(request: Request, object: R2Object) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && (ifNoneMatch === "*" || ifNoneMatch.split(",").some((value) => value.trim() === object.httpEtag))) return 304;
  const ifMatch = request.headers.get("if-match");
  if (ifMatch && ifMatch !== "*" && !ifMatch.split(",").some((value) => value.trim() === object.httpEtag)) return 412;
  return 200;
}

async function r2Response(request: Request, bucket: R2Bucket, key: string) {
  if (request.method === "HEAD") {
    const object = await bucket.head(key);
    if (!object) return null;
    const status = conditionalHeadStatus(request, object);
    const headers = mediaHeaders(object);
    if (status === 200) headers.set("content-length", String(object.size));
    return new Response(null, { status, headers });
  }

  const options: R2GetOptions = {};
  if (request.headers.has("range")) options.range = request.headers;
  if (hasConditionalHeaders(request)) options.onlyIf = request.headers;
  const object = await bucket.get(key, options);
  if (!object) return null;
  const headers = mediaHeaders(object);
  if (!("body" in object)) {
    const status = request.headers.has("if-none-match") || request.headers.has("if-modified-since") ? 304 : 412;
    return new Response(null, { status, headers });
  }

  let status = 200;
  if (request.headers.has("range") && object.range && "offset" in object.range && "length" in object.range && object.range.offset !== undefined && object.range.length !== undefined) {
    status = 206;
    headers.set("content-range", `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
    headers.set("content-length", String(object.range.length));
  } else {
    headers.set("content-length", String(object.size));
  }
  return new Response(object.body, { status, headers });
}

function sourceRequestHeaders(source: string) {
  const headers = new Headers({
    accept: "image/avif,image/webp,image/jpeg,image/png,image/gif,image/*,*/*;q=0.8",
    "user-agent": "Mozilla/5.0 (compatible; PSRHomesMedia/2.0; +https://psrhomes.ae)",
  });
  headers.set("referer", new URL(source).hostname === "new-projects-media.propertyfinder.com"
    ? "https://www.propertyfinder.ae/"
    : "https://psrhomes.ae/");
  return headers;
}

async function writeThroughResponse(request: Request, env: MediaEdgeEnv, ctx: ExecutionContext, media: ResolvedMedia) {
  if (!media.source) return null;
  const upstream = await fetch(media.source, {
    headers: sourceRequestHeaders(media.source),
    redirect: "follow",
  });
  const finalSource = canonicalMediaSource(upstream.url);
  const contentType = (upstream.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
  if (!upstream.ok || !upstream.body || !finalSource || !contentType.startsWith("image/")) {
    logError("media_source_fetch_rejected", new Error(`status=${upstream.status} type=${contentType}`), { key: media.key, host: new URL(media.source).hostname });
    return null;
  }

  const declaredLength = Number(upstream.headers.get("content-length") || 0);
  if (declaredLength > MAX_WRITE_THROUGH_BYTES) {
    const headers = new Headers(upstream.headers);
    headers.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-psr-media", "source-too-large");
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
  }

  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let bodyLength = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bodyLength += chunk.value.byteLength;
    if (bodyLength > MAX_WRITE_THROUGH_BYTES) {
      await reader.cancel();
      logError("media_source_too_large", new Error(`bytes>${MAX_WRITE_THROUGH_BYTES}`), { key: media.key, host: new URL(media.source).hostname });
      return null;
    }
    chunks.push(chunk.value);
  }
  const body = new Uint8Array(bodyLength);
  let bodyOffset = 0;
  for (const chunk of chunks) {
    body.set(chunk, bodyOffset);
    bodyOffset += chunk.byteLength;
  }

  let stored: R2Object | null = null;
  try {
    stored = await env.MEDIA.put(media.key, body, {
      httpMetadata: { contentType, cacheControl: MEDIA_CACHE_CONTROL },
      customMetadata: { source: media.source, migrated: new Date().toISOString().slice(0, 10), strategy: "write-through-v2" },
    });
  } catch (error) {
    logError("media_r2_write_failed", error, { key: media.key, host: new URL(media.source).hostname });
  }

  const headers = new Headers({
    "accept-ranges": "bytes",
    "cache-control": stored ? MEDIA_CACHE_CONTROL : "public, max-age=3600, stale-while-revalidate=86400",
    "content-length": String(bodyLength),
    "content-type": contentType,
    "x-content-type-options": "nosniff",
    "x-psr-media": stored ? "r2-write-through" : "source-proxy",
    "x-psr-r2-key": media.key,
  });
  if (stored) {
    headers.set("etag", stored.httpEtag);
    headers.set("last-modified", stored.uploaded.toUTCString());
  }
  const response = new Response(request.method === "HEAD" ? null : body, { headers });
  const cache = defaultCache();
  if (stored && cache && request.method === "GET") {
    const cachedResponse = response.clone();
    const cachedHeaders = new Headers(cachedResponse.headers);
    cachedHeaders.set("x-psr-media", "r2-edge-cache");
    ctx.waitUntil(cache.put(
      cacheKey(request),
      new Response(cachedResponse.body, { status: cachedResponse.status, statusText: cachedResponse.statusText, headers: cachedHeaders }),
    ).catch((error) => logError("media_cache_put_failed", error, { key: media.key })));
  }
  return response;
}

async function fallbackMedia(request: Request, env: MediaEdgeEnv, reason: string) {
  const fallbackUrl = new URL("/about-jumeirah-burj-banner.webp", request.url);
  const response = await env.SHELL.fetch(new Request(fallbackUrl, { method: request.method, headers: request.headers }));
  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");
  headers.set("x-psr-media", `fallback-${reason}`);
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, statusText: response.statusText, headers });
}

async function serveMedia(request: Request, env: MediaEdgeEnv, ctx: ExecutionContext, media: ResolvedMedia) {
  if (!media.key) return new Response("Invalid media source", { status: 400 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const cache = defaultCache();
  const cacheable = request.method === "GET" && !request.headers.has("range") && !hasConditionalHeaders(request);
  if (cache && cacheable) {
    const cached = await cache.match(cacheKey(request));
    if (cached) return cached;
  }

  const stored = await r2Response(request, env.MEDIA, media.key);
  if (stored) {
    if (cache && cacheable && stored.status === 200) {
      ctx.waitUntil(cache.put(cacheKey(request), stored.clone()).catch((error) => logError("media_cache_put_failed", error, { key: media.key })));
    }
    return stored;
  }

  try {
    const migrated = await writeThroughResponse(request, env, ctx, media);
    if (migrated) return migrated;
  } catch (error) {
    logError("media_write_through_failed", error, { key: media.key, host: media.source ? new URL(media.source).hostname : "unknown" });
  }
  return fallbackMedia(request, env, media.source ? "source-unavailable" : "object-missing");
}

async function readTextBounded(response: Response) {
  if (!response.body) return "";
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_REWRITE_BYTES) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_REWRITE_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
}

function rewritableContentType(response: Response) {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  return ["text/html", "text/x-component", "application/json", "application/ld+json", "text/plain"].some((type) => contentType.includes(type));
}

async function rewriteResponse(request: Request, response: Response, ctx: ExecutionContext) {
  if (request.method !== "GET" || response.status < 200 || response.status >= 300 || !rewritableContentType(response)) return response;
  const source = await readTextBounded(response.clone());
  if (source === null) return response;
  const rewritten = rewriteExternalMediaUrls(source);
  if (rewritten === source) return response;
  if (response.body) ctx.waitUntil(response.body.cancel().catch(() => undefined));
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  headers.set("x-psr-media-cutover", "r2-v2");
  return new Response(rewritten, { status: response.status, statusText: response.statusText, headers });
}

function upstreamFor(request: Request, env: MediaEdgeEnv) {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/") return env.HOME;
  if (pathname.startsWith("/events/roadshow/brochure")) return env.ROADSHOW_BROCHURE;
  if (pathname.startsWith("/events/roadshow/plan")) return env.ROADSHOW_PLAN;
  if (pathname.startsWith("/events/roadshow/unsubscribe")) return env.ROADSHOW_NURTURE;
  if (pathname === "/events/roadshow" || pathname === "/events/roadshow/") return env.ROADSHOW;
  if (pathname.startsWith("/events/roadshow/")) return env.ROADSHOW;
  if (pathname === "/projects" || pathname === "/projects/") return env.PROJECTS;
  return env.SHELL;
}

const worker = {
  async fetch(request: Request, env: MediaEdgeEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const media = await resolveMedia(url.pathname);
    if (media) return serveMedia(request, env, ctx, media);
    try {
      return await rewriteResponse(request, await upstreamFor(request, env).fetch(request), ctx);
    } catch (error) {
      logError("media_edge_request_failed", error, { path: url.pathname });
      return Response.json({ error: "PSR media edge request failed." }, { status: 502 });
    }
  },
} satisfies ExportedHandler<MediaEdgeEnv>;

export default worker;
