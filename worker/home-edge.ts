import { isCacheablePublicDocument, servePublicDocument } from "./cache-policy";
import { ServiceBodyTooLargeError, serviceRequest } from "./forward-request";

interface HomeEdgeEnv {
  ORIGIN: Fetcher;
}

const HOME_DOCUMENT_CACHE_VERSION = "psr-home-photo-night-20260912-v1";
const MAX_REWRITE_BYTES = 2 * 1024 * 1024;
const INSIGHT_IMAGE_PAIRS = [
  ["https://cdn.opr.ae/upload/photo/10.jpeg", "/media/insights/price-per-square-foot-uae-property-guide-2026"],
  ["https://cdn.opr.ae/upload/photo/DWTN%20Residences.jpg", "/media/insights/uae-mortgage-planning-before-reservation"],
  ["https://cdn.opr.ae/upload/photo/Downtown%20Dubai.jpg", "/media/insights/benefits-of-investing-in-uae-real-estate"],
  ["https://cdn.opr.ae/upload/photo/20.jpg", "/media/insights/how-to-evaluate-new-property-launches-uae"],
  ["https://cdn.opr.ae/upload/photo/business-bay.jpg", "/media/insights/monthly-uae-market-tracking-dashboard"],
  ["https://cdn.opr.ae/upload/photo/Palace%20Residences%20Hillside%207.webp", "/media/insights/service-charges-net-yield-uae-property"],
] as const;

function edgeDocumentCache() {
  if (typeof caches === "undefined") return null;
  return (caches as CacheStorage & { default?: Cache }).default || null;
}

function rewriteHomeContent(source: string, isHtml: boolean) {
  let text = source;
  const escapedQuote = String.fromCharCode(92, 34);
  const escapedNewline = String.fromCharCode(92, 110);
  for (const [external, local] of INSIGHT_IMAGE_PAIRS) {
    text = text.split(external).join(local);
    const hint = `:HL[${escapedQuote}${local}${escapedQuote},${escapedQuote}image${escapedQuote}]${escapedNewline}`;
    text = text.split(hint).join("");
    const rscSrc = `${escapedQuote}src${escapedQuote}:${escapedQuote}${local}${escapedQuote}`;
    const rscLazy = `${rscSrc},${escapedQuote}loading${escapedQuote}:${escapedQuote}lazy${escapedQuote}`;
    text = text.split(rscSrc).join(rscLazy);
  }
  if (isHtml) {
    for (const [, local] of INSIGHT_IMAGE_PAIRS) {
      text = text.replace(new RegExp(`<link[^>]*href="${local}"[^>]*>`, "g"), "");
    }
    text = text.replace(/<img([^>]*\ssrc="\/media\/insights\/[^\"]+"[^>]*)>/g, (match, attributes: string) => (
      /\sloading=/.test(attributes) ? match : `<img${attributes} loading="lazy">`
    ));
  }
  return text;
}

async function rewriteHomeResponse(request: Request, response: Response, ctx: ExecutionContext) {
  if (request.method !== "GET" || response.status !== 200 || !response.body) return response;
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!["text/html", "text/x-component", "text/plain"].some((type) => contentType.includes(type))) return response;

  // The homepage needs consistent HTML and embedded RSC replacements. Bound the
  // buffer and retain an untouched stream if an unexpected response is larger.
  const reader = response.clone().body!.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let source = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_REWRITE_BYTES) {
        ctx.waitUntil(reader.cancel().catch(() => undefined));
        return response;
      }
      source += decoder.decode(chunk.value, { stream: true });
    }
    source += decoder.decode();
  } catch (error) {
    ctx.waitUntil(reader.cancel().catch(() => undefined));
    console.warn(JSON.stringify({ event: "home_edge_rewrite_failed", message: error instanceof Error ? error.message.slice(0, 180) : "Unable to read homepage" }));
    return response;
  }
  ctx.waitUntil(response.body.cancel().catch(() => undefined));
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  headers.set("x-psr-home-edge", "3");
  return new Response(rewriteHomeContent(source, contentType.includes("text/html")), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: HomeEdgeEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    let forwarded: Request;
    try {
      forwarded = await serviceRequest(request);
    } catch (error) {
      if (error instanceof ServiceBodyTooLargeError) {
        return new Response("Request body is too large.", { status: 413, headers: { "cache-control": "no-store" } });
      }
      throw error;
    }
    if (url.hostname === "www.psrhomes.ae") {
      url.hostname = "psrhomes.ae";
      url.protocol = "https:";
      return new Response(null, { status: 301, headers: {
        location: url.toString(),
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "strict-origin-when-cross-origin",
        "permissions-policy": "camera=(), microphone=(), geolocation=()",
      } });
    }
    if (url.pathname !== "/") return env.ORIGIN.fetch(forwarded);
    const render = async () => {
      const response = await rewriteHomeResponse(request, await env.ORIGIN.fetch(forwarded), ctx);
      if (response.headers.get("x-psr-document-cache") !== "STALE") return response;
      // The application is already refreshing this document in the background.
      // Keep the outer entry stale so the next request can pick up that refresh,
      // instead of treating the old content as fresh for another five minutes.
      const headers = new Headers(response.headers);
      const cacheControl = headers.get("cache-control");
      headers.set("cache-control", [cacheControl, "no-cache"].filter(Boolean).join(", "));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    };
    if (!isCacheablePublicDocument(request)) return render();
    return servePublicDocument(request, edgeDocumentCache(), HOME_DOCUMENT_CACHE_VERSION, render, (promise) => ctx.waitUntil(promise));
  },
};
