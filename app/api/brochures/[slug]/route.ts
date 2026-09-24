import { env } from "cloudflare:workers";
import { isBrochureAccessToken, resolveProjectDocument, sha256Hex } from "@/lib/brochure-access";
import { getProjectRecord } from "@/lib/imported-projects";
import { projectDossierFilename, renderProjectDossierPdf } from "@/worker/project-dossier";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const record = getProjectRecord(slug);
  const document = record ? resolveProjectDocument(record) : null;
  if (!record || !document) return new Response("Project document is not available.", { status: 404 });

  const accessToken = new URL(request.url).searchParams.get("access") || "";
  if (!isBrochureAccessToken(accessToken)) {
    return Response.json({ error: "Share a valid email and phone number on the project page to download this document." }, {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  }
  const tokenHash = await sha256Hex(accessToken.toLowerCase());
  const access = await env.DB.prepare(
    `SELECT token_hash
     FROM psr_brochure_downloads
     WHERE token_hash = ? AND project_slug = ? AND datetime(expires_at) > datetime('now')
     LIMIT 1`,
  ).bind(tokenHash, record.slug).first<{ token_hash: string }>();
  if (!access) {
    return Response.json({ error: "This private document link has expired or is unavailable." }, {
      status: 410,
      headers: { "cache-control": "private, no-store" },
    });
  }

  if (document.kind === "psr_dossier") {
    const pdf = await renderProjectDossierPdf(record);
    await env.DB.prepare(
      "UPDATE psr_brochure_downloads SET downloaded_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
    ).bind(tokenHash).run();
    return new Response(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, {
      headers: {
        "cache-control": "private, no-store, max-age=0",
        "content-disposition": `attachment; filename="${projectDossierFilename(record)}"`,
        "content-length": String(pdf.byteLength),
        "content-type": "application/pdf",
        "content-security-policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      },
    });
  }

  const requestHeaders = new Headers({
    accept: "application/pdf",
    "user-agent": "PSR-Brochure-Service/1.0",
  });
  const range = request.headers.get("range");
  if (range) requestHeaders.set("range", range);
  const upstream = await fetch(document.url, { headers: requestHeaders, redirect: "manual" });
  const contentType = upstream.headers.get("content-type") || "";
  if (!upstream.ok || !upstream.body || !/^application\/pdf(?:;|$)/i.test(contentType)) {
    await upstream.body?.cancel();
    return new Response("Project brochure is temporarily unavailable.", { status: 502 });
  }

  await env.DB.prepare(
    "UPDATE psr_brochure_downloads SET downloaded_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
  ).bind(tokenHash).run();

  const headers = new Headers({
    "accept-ranges": upstream.headers.get("accept-ranges") || "bytes",
    "cache-control": "private, no-store, max-age=0",
    "content-disposition": `attachment; filename="${slug}-brochure.pdf"`,
    "content-type": "application/pdf",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  const length = upstream.headers.get("content-length");
  const modified = upstream.headers.get("last-modified");
  const contentRange = upstream.headers.get("content-range");
  const etag = upstream.headers.get("etag");
  if (length) headers.set("content-length", length);
  if (modified) headers.set("last-modified", modified);
  if (contentRange) headers.set("content-range", contentRange);
  if (etag) headers.set("etag", etag);

  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers });
}
