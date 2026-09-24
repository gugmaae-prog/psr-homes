const HASHED_ASSET = /\.[A-Za-z0-9_-]{8,}\.(?:css|js|mjs|woff2?|avif|gif|jpe?g|png|svg|webp)$/i;
const MEDIA_ASSET = /\.(?:avif|gif|jpe?g|mp4|png|svg|webm|webp|woff2?)$/i;
const PRIVATE_ROUTE = /^(?:\/(?:api|admin|agent|analytics|leads)(?:\/|$)|\/advisors\/jumanah\/dubai-south(?:\/|$))/;
// Only ignore cookies that cannot personalize server-rendered PSR content.
// Unknown cookies, including every application session, still bypass caching.
const NON_PERSONAL_COOKIE = /^(?:_ga(?:_[A-Za-z0-9]+)?|_gid|_gat(?:_[A-Za-z0-9_]+)?|_fbp|_gcl_au|__cf_bm|cf_clearance|_cfuvid)$/;
const DOCUMENT_FRESH_MS = 300_000;
const DOCUMENT_RETENTION_SECONDS = 1_800;
const DOCUMENT_STORED_AT = "x-psr-document-stored-at";

function appendVary(headers: Headers, value: string) {
  const entries = (headers.get("vary") || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!entries.some((entry) => entry.toLowerCase() === value.toLowerCase())) entries.push(value);
  headers.set("vary", entries.join(", "));
}

export function assetCacheControl(pathname: string) {
  if (pathname.includes("/_next/static/") || HASHED_ASSET.test(pathname)) {
    return "public, max-age=31536000, immutable";
  }
  if (MEDIA_ASSET.test(pathname)) {
    return "public, max-age=86400, stale-while-revalidate=604800";
  }
  return "public, max-age=3600, stale-while-revalidate=86400";
}

export function withAssetCacheHeaders(response: Response, pathname: string, method = "GET") {
  const headers = new Headers(response.headers);
  headers.set("cache-control", assetCacheControl(pathname));
  appendVary(headers, "Accept-Encoding");
  return new Response(method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isCacheablePublicDocument(request: Request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (PRIVATE_ROUTE.test(url.pathname)) return false;
  if (request.headers.has("authorization")) return false;
  const cookies = (request.headers.get("cookie") || "").split(";").map((value) => value.trim()).filter(Boolean);
  if (cookies.some((cookie) => !NON_PERSONAL_COOKIE.test(cookie.split("=", 1)[0]))) return false;
  if (request.headers.has("range") || request.headers.has("rsc") || request.headers.has("next-router-state-tree")) return false;
  return (request.headers.get("accept") || "").includes("text/html");
}

export function isPrivateDocument(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const url = new URL(request.url);
  return PRIVATE_ROUTE.test(url.pathname);
}

export function withPrivateDocumentCacheHeaders(response: Response, method = "GET") {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store");
  headers.set("pragma", "no-cache");
  return new Response(method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function publicDocumentCacheKey(request: Request, version: string) {
  const url = new URL(request.url);
  url.searchParams.set("__psr_document", version);
  return new Request(url.toString(), {
    method: "GET",
    headers: { accept: "text/html" },
  });
}

export function withPublicDocumentCacheHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=0, s-maxage=300, stale-while-revalidate=1500");
  appendVary(headers, "Accept-Encoding");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function canStoreDocument(response: Response) {
  return response.status === 200
    && (response.headers.get("content-type") || "").includes("text/html")
    && !response.headers.has("set-cookie")
    && !/(?:^|,)\s*(?:private|no-store|no-cache)\b/i.test(response.headers.get("cache-control") || "")
    && !(response.headers.get("vary") || "").split(",").some((value) => /^(?:\*|cookie|authorization)$/i.test(value.trim()));
}

type DocumentCache = Pick<Cache, "match" | "put">;

/** Cloudflare's Cache API does not implement stale-while-revalidate itself. */
export async function servePublicDocument(
  request: Request,
  cache: DocumentCache | null,
  version: string,
  render: () => Promise<Response>,
  waitUntil: (promise: Promise<unknown>) => void,
  now = Date.now(),
) {
  const key = publicDocumentCacheKey(request, version);
  const reportCacheError = (error: unknown) => {
    console.warn(JSON.stringify({ event: "public_document_cache_failed", message: error instanceof Error ? error.message.slice(0, 180) : "Cache unavailable" }));
  };
  const store = async (response: Response) => {
    if (!cache || !canStoreDocument(response)) return;
    const stored = new Response(response.body, response);
    stored.headers.set("cache-control", `public, max-age=${DOCUMENT_RETENTION_SECONDS}`);
    stored.headers.set(DOCUMENT_STORED_AT, String(Date.now()));
    await cache.put(key, stored);
  };
  const deliver = (response: Response, status: string) => {
    const result = withPublicDocumentCacheHeaders(response);
    result.headers.delete(DOCUMENT_STORED_AT);
    result.headers.delete("age");
    result.headers.set("x-psr-document-cache", status);
    return result;
  };
  let cached: Response | undefined;
  try { cached = await cache?.match(key); } catch (error) { reportCacheError(error); }
  if (cached) {
    const storedAt = Number(cached.headers.get(DOCUMENT_STORED_AT));
    const age = now - storedAt;
    if (storedAt > 0 && age >= 0 && age < DOCUMENT_RETENTION_SECONDS * 1_000) {
      const fresh = age < DOCUMENT_FRESH_MS;
      if (!fresh) waitUntil(render().then(store).catch(reportCacheError));
      return deliver(cached, fresh ? "HIT" : "STALE");
    }
  }
  const response = await render();
  if (!canStoreDocument(response)) return response;
  if (cache) waitUntil(store(response.clone()).catch(reportCacheError));
  return deliver(response, "MISS");
}
