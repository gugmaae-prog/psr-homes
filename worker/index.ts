/** Cloudflare Worker entry point for the PSR application. */
import handler from "vinext/server/app-router-entry";
import { currentAgentSession, handleAgentRequest, syncAllPropertyFinderListings } from "./agent-backend";
import { handleAnalyticsRequest, pruneAnalyticsData } from "./analytics-backend";
import {
  handleContentRequest,
  mergeProjectCatalogueResponse,
  syncDailyMarketInsight,
  syncLatestProjectLaunches,
} from "./content-sync";
import { SonuPublicAgent, GracePublicAgent } from "./sonu-public-agent";
import { pruneExpiredSonuClientBriefs } from "./sonu-brief-service";
import { pruneExpiredBrochureDownloads } from "./brochure-access-cleanup";
import { handleLeadsDashboardRequest } from "./leads-backend";
import { handleTranslationRequest } from "./translation";
import { ingestInboxEmail } from "./inbox-backend";
import { handleProjectSearchIntent } from "./project-search";
import { handleSemanticSearch } from "./semantic-search";
import { handlePresentationAccess } from "./presentation-access";
import {
  isCacheablePublicDocument,
  isPrivateDocument,
  servePublicDocument,
  withAssetCacheHeaders,
  withPrivateDocumentCacheHeaders,
} from "./cache-policy";

// GracePublicAgent is a temporary rollout alias required by the no-downtime Durable Object rename.
// Remove the alias only after the Sonu class migration has deployed and fully rolled out.
export { SonuPublicAgent, GracePublicAgent };

const STATIC_ASSET = /\.(?:avif|css|gif|ico|jpe?g|js|json|mp4|png|svg|webm|webp|woff2?)$/i;
const PUBLIC_DOCUMENT_CACHE_VERSION = "psr-photo-night-20260912-v1";

function edgeDocumentCache() {
  if (typeof caches === "undefined") return null;
  return (caches as CacheStorage & { default?: Cache }).default || null;
}

function isStaticAsset(pathname: string) {
  return pathname.includes("/_next/static/")
    || /^\/(?:@id\/|@fs\/|@vite\/|@react-refresh$|node_modules\/.vite\/|app\/|components\/|lib\/|data\/)/.test(pathname)
    || STATIC_ASSET.test(pathname);
}

function withProductionHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  if (!headers.has("referrer-policy")) headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function sonuSessionId(request: Request) {
  const candidate = request.headers.get("x-sonu-session")?.trim() || "";
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(candidate)
    ? candidate
    : "";
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === "www.psrhomes.ae") {
      url.hostname = "psrhomes.ae";
      url.protocol = "https:";
      return withProductionHeaders(Response.redirect(url.toString(), 301));
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/favicon.ico") {
      const iconUrl = new URL("/brand/psr-favicon-master.png?v=psr-20260818", request.url);
      const icon = await env.ASSETS.fetch(new Request(iconUrl, request));
      const headers = new Headers(icon.headers);
      headers.set("content-type", "image/png");
      headers.set("cache-control", "public, max-age=604800, stale-while-revalidate=2592000");
      return withProductionHeaders(new Response(request.method === "HEAD" ? null : icon.body, {
        status: icon.status,
        headers,
      }));
    }
    const presentationAccessResponse = await handlePresentationAccess(request, env);
    if (presentationAccessResponse) return withProductionHeaders(presentationAccessResponse);
    if (url.pathname === "/api/sonu-chat") {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)) {
        return withProductionHeaders(Response.json({ error: "Invalid request origin." }, { status: 403 }));
      }
      let agentSession: Awaited<ReturnType<typeof currentAgentSession>> = null;
      try {
        agentSession = await currentAgentSession(request, env);
      } catch (error) {
        console.error(JSON.stringify({
          event: "sonu_agent_session_lookup_failed",
          message: error instanceof Error ? error.message.slice(0, 300) : "Session lookup failed",
        }));
      }
      const visitorSessionId = sonuSessionId(request);
      if (!visitorSessionId) {
        return withProductionHeaders(Response.json({ error: "A valid chat session is required." }, { status: 400 }));
      }
      const sessionId = agentSession
        ? `psr-agent:${agentSession.email}:${visitorSessionId}`
        : `psr-visitor:${visitorSessionId}`;
      // Legacy binding name retained temporarily to preserve the live Durable Object namespace.
      const sonu = env.SONU_PUBLIC_AGENT.getByName(sessionId);
      const headers = new Headers(request.headers);
      headers.delete("x-sonu-agent-email");
      headers.delete("x-sonu-agent-name");
      headers.delete("x-sonu-agent-title");
      if (agentSession) {
        headers.set("x-sonu-agent-email", agentSession.email);
        headers.set("x-sonu-agent-name", agentSession.name);
        headers.set("x-sonu-agent-title", agentSession.title);
      }
      return withProductionHeaders(await sonu.fetch(new Request(request, { headers })));
    }
    const translationResponse = await handleTranslationRequest(request, env);
    if (translationResponse) return withProductionHeaders(translationResponse);
    const projectSearchResponse = await handleProjectSearchIntent(request, env);
    if (projectSearchResponse) return withProductionHeaders(projectSearchResponse);
    const semanticSearchResponse = await handleSemanticSearch(request, env);
    if (semanticSearchResponse) return withProductionHeaders(semanticSearchResponse);
    const contentResponse = await handleContentRequest(request, env, ctx);
    if (contentResponse) return withProductionHeaders(contentResponse);
    const analyticsResponse = await handleAnalyticsRequest(request, env);
    if (analyticsResponse) return withProductionHeaders(analyticsResponse);
    const leadsResponse = await handleLeadsDashboardRequest(request, env);
    if (leadsResponse) return withProductionHeaders(leadsResponse);
    const agentResponse = await handleAgentRequest(request, env);
    if (agentResponse) return withProductionHeaders(agentResponse);
    if ((request.method === "GET" || request.method === "HEAD") && isStaticAsset(url.pathname)) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return withProductionHeaders(withAssetCacheHeaders(asset, url.pathname, request.method));
    }
    if (request.method === "GET" && url.pathname === "/api/projects") {
      const catalogue = await handler.fetch(request, env, ctx);
      return withProductionHeaders(await mergeProjectCatalogueResponse(
        request,
        env,
        catalogue,
        (page) => {
          const staticUrl = new URL(request.url);
          staticUrl.searchParams.set("page", String(page));
          return handler.fetch(new Request(staticUrl.toString(), { headers: request.headers }), env, ctx);
        },
      ));
    }
    if (isPrivateDocument(request)) {
      return withProductionHeaders(withPrivateDocumentCacheHeaders(
        await handler.fetch(request, env, ctx),
        request.method,
      ));
    }
    if (isCacheablePublicDocument(request)) {
      return withProductionHeaders(await servePublicDocument(
        request,
        edgeDocumentCache(),
        PUBLIC_DOCUMENT_CACHE_VERSION,
        () => handler.fetch(request, env, ctx),
        (promise) => ctx.waitUntil(promise),
      ));
    }
    return withProductionHeaders(await handler.fetch(request, env, ctx));
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(Promise.all([
      syncAllPropertyFinderListings(env),
      pruneAnalyticsData(env),
      syncLatestProjectLaunches(env),
      syncDailyMarketInsight(env),
      pruneExpiredSonuClientBriefs(env),
      pruneExpiredBrochureDownloads(env),
    ]));
  },
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    await ingestInboxEmail(message, env);
  },
};

export default worker;
