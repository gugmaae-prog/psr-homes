import { env } from "cloudflare:workers";

type BriefDownloadRow = {
  object_key: string;
  filename: string;
  expires_at: string;
};

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return Response.json({ error: "This private brief link is invalid." }, { status: 404 });
  }

  const tokenHash = await sha256Hex(token.toLowerCase());
  const row = await env.DB.prepare(
    `SELECT object_key, filename, expires_at
     FROM psr_public_brief_downloads
     WHERE token_hash = ? AND datetime(expires_at) > datetime('now')
     LIMIT 1`,
  ).bind(tokenHash).first<BriefDownloadRow>();
  if (!row) {
    return Response.json({ error: "This private brief link has expired or is unavailable." }, {
      status: 410,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const object = await env.MEDIA.get(row.object_key);
  if (!object) {
    return Response.json({ error: "The private brief is unavailable." }, { status: 404 });
  }

  await env.DB.prepare(
    "UPDATE psr_public_brief_downloads SET downloaded_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
  ).bind(tokenHash).run();

  return new Response(object.body, {
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${row.filename.replace(/["\\]/g, "_")}"`,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
    },
  });
}
