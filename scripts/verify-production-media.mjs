import { promises as fs } from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components", "data", "lib", "worker", "tests"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md"]);
const MEDIA_RE = /["'`]((?:\/(?!\/)[^"'\`\s?#]+)\.(?:avif|gif|jpe?g|png|svg|webm|webp|pdf))(?:\?[^"'\`\s]*)?["'`]/gi;
const BASE_URL = process.env.PSR_MEDIA_BASE_URL || "https://psrhomes.ae";
const CONCURRENCY = Math.max(1, Math.min(24, Number(process.env.PSR_MEDIA_CONCURRENCY || 12)));
const TIMEOUT_MS = Math.max(3000, Number(process.env.PSR_MEDIA_TIMEOUT_MS || 12000));
const RETRIES = Math.max(0, Math.min(3, Number(process.env.PSR_MEDIA_RETRIES || 1)));

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function normalizeMediaPath(value) {
  if (!value || value.includes("\${")) return "";
  if (value.startsWith("//")) return "";
  if (value.startsWith("/media/external/source/")) return "";
  return value.replace(/\\u0026/gi, "&");
}

async function discover() {
  const found = new Map();
  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      const source = await fs.readFile(file, "utf8");
      for (const match of source.matchAll(MEDIA_RE)) {
        const mediaPath = normalizeMediaPath(match[1]);
        if (!mediaPath) continue;
        const refs = found.get(mediaPath) || new Set();
        refs.add(file);
        found.set(mediaPath, refs);
      }
    }
  }
  return [...found.entries()]
    .map(([mediaPath, refs]) => ({ mediaPath, refs: [...refs].sort() }))
    .sort((a, b) => a.mediaPath.localeCompare(b.mediaPath));
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

async function probe(mediaPath) {
  const url = new URL(mediaPath, BASE_URL).toString();
  let last = null;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      let response = await fetchWithTimeout(url, {
        method: "HEAD",
        headers: { "user-agent": "PSR-Media-Acceptance/1.0" },
      });
      if ([403, 405].includes(response.status)) {
        response = await fetchWithTimeout(url, {
          method: "GET",
          headers: {
            "user-agent": "PSR-Media-Acceptance/1.0",
            range: "bytes=0-0",
          },
        });
      }
      if (response.status >= 200 && response.status < 400) {
        return {
          ok: true,
          status: response.status,
          contentType: response.headers.get("content-type") || "",
          finalUrl: response.url,
        };
      }
      last = { ok: false, status: response.status, finalUrl: response.url };
    } catch (error) {
      last = { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
    }
    if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  return last || { ok: false, status: 0, error: "unknown probe failure" };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

const media = await discover();
console.log(`Discovered ${media.length} static media references across source files.`);

const results = await mapLimit(media, CONCURRENCY, async (item, index) => {
  const result = await probe(item.mediaPath);
  const marker = result.ok ? "OK" : "FAIL";
  console.log(`[${index + 1}/${media.length}] ${marker} ${item.mediaPath} ${result.status || ""}`);
  return { ...item, ...result };
});

const failures = results.filter((item) => !item.ok);
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  discovered: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  failures,
};
await fs.mkdir("outputs", { recursive: true });
await fs.writeFile("outputs/production-media-acceptance.json", JSON.stringify(report, null, 2) + "\n");

if (failures.length) {
  console.error("\nProduction media failures:");
  for (const failure of failures) {
    console.error(`- ${failure.mediaPath} status=${failure.status || 0} refs=${failure.refs.join(",")}`);
  }
  process.exitCode = 1;
} else {
  console.log(`All ${results.length} production media references resolved successfully.`);
}
