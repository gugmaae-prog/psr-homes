export async function pruneExpiredBrochureDownloads(env: Env) {
  await env.DB.prepare(
    "DELETE FROM psr_brochure_downloads WHERE datetime(expires_at) <= datetime('now')",
  ).run();
}
