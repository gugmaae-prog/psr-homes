import assert from "node:assert/strict";
import test from "node:test";
import {
  assetCacheControl,
  isCacheablePublicDocument,
  isPrivateDocument,
  publicDocumentCacheKey,
  servePublicDocument,
  withAssetCacheHeaders,
  withPrivateDocumentCacheHeaders,
  withPublicDocumentCacheHeaders,
} from "../worker/cache-policy";

test("hashed framework assets receive immutable caching", () => {
  assert.equal(assetCacheControl("/_next/static/chunks/app-8a72bc91.js"), "public, max-age=31536000, immutable");
});

test("editable media receives bounded stale-while-revalidate caching", () => {
  assert.equal(assetCacheControl("/hero/psr-cinematic-dubai.webp"), "public, max-age=86400, stale-while-revalidate=604800");
  assert.equal(assetCacheControl("/hero/psr-home-reel.mp4"), "public, max-age=86400, stale-while-revalidate=604800");
});

test("HEAD asset responses retain headers without returning a body", async () => {
  const response = withAssetCacheHeaders(new Response("asset", { headers: { "content-type": "text/css" } }), "/_next/static/css/app-deadbeef.css", "HEAD");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(await response.text(), "");
});

test("anonymous public HTML can use the short deployment-versioned edge cache", () => {
  const request = new Request("https://psr.espacios.me/projects/sample", { headers: { accept: "text/html,application/xhtml+xml" } });
  assert.equal(isCacheablePublicDocument(request), true);
  const key = new URL(publicDocumentCacheKey(request, "release-7").url);
  assert.equal(key.searchParams.get("__psr_document"), "release-7");
  const response = withPublicDocumentCacheHeaders(new Response("page", { headers: { "content-type": "text/html", vary: "RSC" } }));
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, s-maxage=300, stale-while-revalidate=1500");
  assert.equal(response.headers.get("vary"), "RSC, Accept-Encoding");
});

test("analytics cookies can reuse public HTML while unknown sessions remain isolated", () => {
  const request = (cookie: string) => new Request("https://psrhomes.ae/", { headers: { accept: "text/html", cookie } });
  assert.equal(isCacheablePublicDocument(request("_ga=visitor; _ga_AB123=visit; _fbp=click; cf_clearance=challenge")), true);
  for (const cookie of ["psr_agent_session=private", "hg_leads_session=private", "session=private", "_ga=ok; custom_session=private"]) {
    assert.equal(isCacheablePublicDocument(request(cookie)), false);
  }
});

test("public document hits skip rendering and stale documents refresh after responding", async () => {
  const request = new Request("https://psrhomes.ae/", { headers: { accept: "text/html" } });
  let stored: Response | undefined;
  let renders = 0;
  const pending: Promise<unknown>[] = [];
  const cache = {
    match: async () => stored?.clone(),
    put: async (_key: RequestInfo | URL, response: Response) => { stored = response.clone(); },
  };
  let finishRefresh: ((response: Response) => void) | undefined;
  const render = async () => {
    renders++;
    return renders === 1 ? new Response("original", { headers: { "content-type": "text/html" } })
      : new Promise<Response>((resolve) => { finishRefresh = resolve; });
  };
  const run = (now?: number) => servePublicDocument(request, cache, "release-test", render, (p) => pending.push(p), now);
  const miss = await run();
  assert.equal(miss.headers.get("x-psr-document-cache"), "MISS");
  await Promise.all(pending);
  const storedAt = Number(stored!.headers.get("x-psr-document-stored-at"));
  const hit = await run(storedAt + 1000);
  assert.equal(hit.headers.get("x-psr-document-cache"), "HIT");
  assert.equal(renders, 1);
  const stale = await run(storedAt + 301_000);
  assert.equal(stale.headers.get("x-psr-document-cache"), "STALE");
  assert.equal(stale.headers.has("x-psr-document-stored-at"), false);
  assert.equal(await stale.text(), "original");
  assert.equal(renders, 2);
  finishRefresh!(new Response("updated", { headers: { "content-type": "text/html" } }));
  await Promise.all(pending);
  assert.equal(await stored!.text(), "updated");
});

test("public cache preserves private, cookie-setting, error and non-HTML responses", async () => {
  const request = new Request("https://psrhomes.ae/", { headers: { accept: "text/html" } });
  let writes = 0;
  const cache = { match: async () => undefined, put: async () => { writes++; } };
  const cases = [
    new Response("private", { headers: { "content-type": "text/html", "cache-control": "private, no-store" } }),
    new Response("cookie", { headers: { "content-type": "text/html", "set-cookie": "session=private" } }),
    new Response("failed", { status: 500, headers: { "content-type": "text/html" } }),
    new Response("json", { headers: { "content-type": "application/json" } }),
    new Response("vary", { headers: { "content-type": "text/html", vary: "Cookie" } }),
  ];
  for (const response of cases) {
    const actual = await servePublicDocument(request, cache, "test", async () => response, () => assert.fail("Must not schedule private cache writes"));
    assert.equal(actual, response);
  }
  assert.equal(writes, 0);
});

test("protected, authenticated and RSC requests never enter the public document cache", () => {
  assert.equal(isCacheablePublicDocument(new Request("https://psr.espacios.me/admin", { headers: { accept: "text/html" } })), false);
  assert.equal(isCacheablePublicDocument(new Request("https://psr.espacios.me/agent", { headers: { accept: "text/html" } })), false);
  assert.equal(isCacheablePublicDocument(new Request("https://psr.espacios.me/projects", { headers: { accept: "text/html", cookie: "psr_agent_session=private" } })), false);
  assert.equal(isCacheablePublicDocument(new Request("https://psr.espacios.me/projects", { headers: { accept: "text/html", rsc: "1" } })), false);
  assert.equal(isCacheablePublicDocument(new Request("https://psr.espacios.me/advisors/jumanah/dubai-south", { headers: { accept: "text/html" } })), false);
});

test("private HTML receives an explicit no-store policy", async () => {
  const request = new Request("https://psr.espacios.me/admin", { headers: { accept: "text/html" } });
  assert.equal(isPrivateDocument(request), true);
  assert.equal(isPrivateDocument(new Request("https://psr.espacios.me/admin")), true);
  assert.equal(isPrivateDocument(new Request("https://psr.espacios.me/advisors/jumanah/dubai-south")), true);
  assert.equal(isPrivateDocument(new Request("https://psr.espacios.me/projects", { headers: { accept: "text/html" } })), false);
  const response = withPrivateDocumentCacheHeaders(new Response("private"));
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(await response.text(), "private");
});
