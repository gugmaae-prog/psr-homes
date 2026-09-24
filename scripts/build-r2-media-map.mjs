#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function canonicalSource(value) {
  const url = new URL(String(value).trim().replaceAll("&amp;", "&").replace(/\\u0026/gi, "&"));
  if (url.protocol !== "https:") throw new Error(`Only HTTPS media sources are supported: ${value}`);
  url.hash = "";
  return url.href;
}

const inventoryPath = argument("--inventory");
const outputPath = argument("--output") || "data/r2-external-media-map.json";

if (!inventoryPath) {
  console.error("Usage: node scripts/build-r2-media-map.mjs --inventory <r2-inventory.json> [--output <path>]");
  process.exit(64);
}

const inventory = JSON.parse(readFileSync(resolve(inventoryPath), "utf8"));
if (inventory.bucket !== "psr-property-media" || inventory.prefix !== "external/" || !Array.isArray(inventory.objects)) {
  throw new Error("The inventory is not an external-media export from psr-property-media.");
}

const sources = new Map();
for (const object of inventory.objects) {
  const key = String(object?.key || "");
  const source = object?.custom_metadata?.source;
  const contentType = String(object?.http_metadata?.contentType || "");
  if (!/^external\/[a-f0-9]{16}$/.test(key)) throw new Error(`Unexpected external R2 key: ${key}`);
  if (!source) throw new Error(`Missing source metadata for ${key}`);
  if (!contentType.startsWith("image/")) throw new Error(`Non-image object in external inventory: ${key}`);

  const canonical = canonicalSource(source);
  const id = key.slice("external/".length);
  const existing = sources.get(canonical);
  if (!existing || id < existing) sources.set(canonical, id);
}

const payload = {
  version: 1,
  bucket: inventory.bucket,
  prefix: inventory.prefix,
  generatedAt: inventory.generatedAt,
  objectCount: inventory.objects.length,
  sourceCount: sources.size,
  sources: Object.fromEntries([...sources].sort(([left], [right]) => left.localeCompare(right))),
};

writeFileSync(resolve(outputPath), `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ output: resolve(outputPath), objectCount: payload.objectCount, sourceCount: payload.sourceCount }));
