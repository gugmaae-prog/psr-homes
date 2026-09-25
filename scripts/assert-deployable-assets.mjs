import { promises as fs } from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components", "data", "lib", "worker"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md"]);
const MEDIA_RE = /["'`]((?:\/(?!\/)[^"'`\s?#]+)\.(?:avif|gif|jpe?g|png|svg|webm|webp|pdf))(?:\?[^"'`\s]*)?["'`]/gi;
const ASSET_ROOT = process.env.PSR_ASSET_ROOT || "dist/client";

function normalizeMediaPath(value) {
  if (!value || value.includes("${")) return "";
  if (value.startsWith("//") || value.includes("..")) return "";
  if (value.startsWith("/media/external/")) return "";
  return value.replace(/\\u0026/gi, "&");
}

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
  return [...found.keys()].sort();
}

const assetRoot = path.resolve(ASSET_ROOT);
const rootStat = await fs.stat(assetRoot).catch(() => null);
if (!rootStat?.isDirectory()) {
  console.error(`Refusing to deploy: asset directory ${ASSET_ROOT} does not exist.`);
  console.error("Build the client, with public/ present, before wrangler deploy replaces the live asset manifest.");
  process.exit(1);
}

const mediaPaths = await discover();
const missing = [];
for (const mediaPath of mediaPaths) {
  const assetPath = path.resolve(assetRoot, mediaPath.slice(1));
  if (assetPath !== assetRoot && !assetPath.startsWith(assetRoot + path.sep)) {
    missing.push(mediaPath);
    continue;
  }
  const stat = await fs.stat(assetPath).catch(() => null);
  if (!stat?.isFile()) missing.push(mediaPath);
}

if (missing.length) {
  console.error(`Refusing to deploy: ${missing.length} of ${mediaPaths.length} referenced media files are missing from ${ASSET_ROOT}.`);
  console.error("wrangler deploy replaces the Workers asset manifest. public/ is not in git, so a checkout without those files deletes them from production.");
  for (const mediaPath of missing.slice(0, 40)) console.error(`- ${mediaPath}`);
  if (missing.length > 40) console.error(`- … ${missing.length - 40} more`);
  process.exit(1);
}

console.log(`Asset directory contains all ${mediaPaths.length} referenced media files.`);
