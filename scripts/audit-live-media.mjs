import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const ORIGIN = (process.env.PSR_MEDIA_AUDIT_ORIGIN || "https://psrhomes.ae").replace(/\/$/, "");
const CONCURRENCY = Math.max(1, Math.min(32, Number(process.env.PSR_MEDIA_AUDIT_CONCURRENCY || 16)));
const TIMEOUT_MS = Math.max(2000, Number(process.env.PSR_MEDIA_AUDIT_TIMEOUT_MS || 12000));
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".css"]);
const MEDIA_PATH_RE = /(["'])(\/[^"'\r\n]+)\1/g;
const MEDIA_EXTENSION_RE = /\.(?:avif|gif|jpe?g|png|svg|webm|webp|mp4|pdf)$/i;
const EXCLUDED_PREFIXES = ["/api/", "/private-", "/_next/"];
const ROOTS = ["app", "components", "data", "lib", "worker"];

async function walk(directory) {
  const out = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) out.push(path);
  }
  return out;
}

async function collectLocalMediaPaths() {
  const paths = new Set();
  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      const source = await readFile(file, "utf8");
      for (const match of source.matchAll(MEDIA_PATH_RE)) {
        const value = match[2].split(/[?#]/, 1)[0];
        if (!MEDIA_EXTENSION_RE.test(value)) continue;
        if (value.includes("\\\\") || value.includes("${")) continue;
        if (EXCLUDED_PREFIXES.some((prefix) => value.startsWith(prefix))) continue;
        paths.add(value);
      }
    }
  }
  return [...paths].sort();
}

function expectedType(path) {
  if (/\.pdf$/i.test(path)) return "application/pdf";
  if (/\.(?:mp4|webm)$/i.test(path)) return "video/";
  if (/\.svg$/i.test(path)) return "image/svg";
  return "image/";
}

async function request(url, { method = "GET", range = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      headers: range ? { range: "bytes=0-1023", "user-agent": "PSR-Live-Media-Audit/1.0" } : { "user-agent": "PSR-Live-Media-Audit/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyPublicAsset(path) {
  const url = ORIGIN + path;
  try {
    const response = await request(url);
    const type = (response.headers.get("content-type") || "").toLowerCase();
    const expected = expectedType(path);
    await response.body?.cancel();
    return {
      kind: "public",
      path,
      url,
      ok: response.ok && type.startsWith(expected),
      status: response.status,
      contentType: type,
    };
  } catch (error) {
    return { kind: "public", path, url, ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function verifyExternalObject(id) {
  const path = `/media/external/${id}`;
  const url = ORIGIN + path;
  try {
    const response = await request(url, { method: "HEAD", range: false });
    const type = (response.headers.get("content-type") || "").toLowerCase();
    const mode = response.headers.get("x-psr-media") || "";
    await response.body?.cancel();
    return {
      kind: "r2-external",
      id,
      url,
      ok: response.ok && type.startsWith("image/") && !mode.startsWith("fallback"),
      status: response.status,
      contentType: type,
      mode,
    };
  } catch (error) {
    return { kind: "r2-external", id, url, ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length || 1) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) break;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const manifest = JSON.parse(await readFile("data/r2-external-media-map.json", "utf8"));
const sourceEntries = Object.entries(manifest.sources || {});
const ids = [...new Set(sourceEntries.map(([, id]) => id))].sort();
const manifestProblems = [];
if (manifest.bucket !== "psr-property-media") manifestProblems.push(`unexpected bucket: ${manifest.bucket}`);
if (manifest.prefix !== "external/") manifestProblems.push(`unexpected prefix: ${manifest.prefix}`);
if (manifest.sourceCount !== sourceEntries.length) manifestProblems.push(`sourceCount ${manifest.sourceCount} != ${sourceEntries.length}`);
if (ids.length !== sourceEntries.length) manifestProblems.push(`non-unique external object ids: ${ids.length} ids for ${sourceEntries.length} sources`);
if (manifest.objectCount < ids.length) manifestProblems.push(`objectCount ${manifest.objectCount} < referenced ids ${ids.length}`);

const publicPaths = await collectLocalMediaPaths();
console.log(`Auditing ${publicPaths.length} public media references against ${ORIGIN}`);
const publicResults = await pool(publicPaths, verifyPublicAsset);
console.log(`Auditing ${ids.length} R2 external-media routes against ${ORIGIN}`);
const externalResults = await pool(ids, verifyExternalObject);

const failures = [
  ...publicResults.filter((result) => !result.ok),
  ...externalResults.filter((result) => !result.ok),
];

console.log(JSON.stringify({
  origin: ORIGIN,
  manifest: {
    generatedAt: manifest.generatedAt,
    declaredObjects: manifest.objectCount,
    declaredSources: manifest.sourceCount,
    uniqueObjectIds: ids.length,
    problems: manifestProblems,
  },
  publicMediaReferences: publicPaths.length,
  failedPublicMedia: publicResults.filter((result) => !result.ok).length,
  checkedExternalObjects: ids.length,
  failedExternalObjects: externalResults.filter((result) => !result.ok).length,
}, null, 2));

for (const problem of manifestProblems) console.error(JSON.stringify({ kind: "manifest", problem }));
for (const failure of failures.slice(0, 200)) console.error(JSON.stringify(failure));
if (failures.length > 200) console.error(`... ${failures.length - 200} additional failures omitted`);

if (manifestProblems.length || failures.length) process.exitCode = 1;
