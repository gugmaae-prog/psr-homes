import { promises as fs } from "node:fs";

const token = process.env.CLOUDFLARE_API_TOKEN || "";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const zoneName = process.env.CLOUDFLARE_ZONE_NAME || "psrhomes.ae";
const relevantWorkers = [
  "psr-property",
  "psr-home-edge",
  "psr-media-edge",
  "psr-jumanah-presentation-edge",
  "psr-home-video-guard",
  "psr-roadshow-dates",
  "psr-roadshow-brochure",
  "psr-roadshow-plan",
  "psr-roadshow-nurture",
  "psr-projects-clean",
  "psr-shell-events",
];

const report = {
  checkedAt: new Date().toISOString(),
  credentialsAvailable: Boolean(token && accountId),
  accountIdPresent: Boolean(accountId),
  zoneName,
  zone: null,
  routes: [],
  workers: {},
  accountResources: {},
  errors: [],
};

async function cf(path) {
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(path + " -> " + response.status + " " + JSON.stringify(data.errors || data));
  }
  return data.result;
}


async function publicProbe(base, pathname) {
  const url = new URL(pathname, base).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "PSR-Cloudflare-Audit/1.0", accept: "text/html,*/*;q=0.8" },
    });
    const body = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", body);
    const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const keep = ["content-type","location","server","cf-ray","x-psr-home-edge","x-psr-media-cutover","x-psr-media","x-psr-document-cache"];
    const headers = {};
    for (const name of keep) {
      const value = response.headers.get(name);
      if (value) headers[name] = value;
    }
    return { url, status: response.status, bytes: body.byteLength, sha256, headers };
  } catch (error) {
    return { url, status: 0, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const publicPaths = ["/", "/events/roadshow", "/projects", "/advisors/jumanah/dubai-south"];
report.publicRuntime = [];
for (const pathname of publicPaths) {
  const production = await publicProbe("https://psrhomes.ae", pathname);
  const directOrigin = await publicProbe("https://psr.espacios.me", pathname);
  report.publicRuntime.push({
    pathname,
    production,
    directOrigin,
    sameBody: Boolean(production.sha256 && directOrigin.sha256 && production.sha256 === directOrigin.sha256),
  });
}

if (!report.credentialsAvailable) {
  console.log("Cloudflare Actions credentials are not configured on this repository.");
} else {
  try {
    const zones = await cf("/zones?name=" + encodeURIComponent(zoneName) + "&account.id=" + encodeURIComponent(accountId));
    const zone = Array.isArray(zones) ? zones[0] : null;
    report.zone = zone ? { id: zone.id, name: zone.name, status: zone.status } : null;
    if (!zone) throw new Error("Zone not found: " + zoneName);
    report.routes = (await cf("/zones/" + zone.id + "/workers/routes")).map((route) => ({
      id: route.id,
      pattern: route.pattern,
      script: route.script || null,
    }));
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  }

  for (const worker of relevantWorkers) {
    const entry = { deployments: null, settings: null, errors: [] };
    try {
      const deployments = await cf("/accounts/" + accountId + "/workers/scripts/" + worker + "/deployments");
      entry.deployments = Array.isArray(deployments)
        ? deployments.slice(0, 5).map((d) => ({
            id: d.id,
            created_on: d.created_on,
            source: d.source,
            strategy: d.strategy,
            annotations: d.annotations || null,
          }))
        : deployments;
    } catch (error) {
      entry.errors.push(error instanceof Error ? error.message : String(error));
    }
    try {
      const settings = await cf("/accounts/" + accountId + "/workers/scripts/" + worker + "/settings");
      entry.settings = {
        compatibility_date: settings.compatibility_date || null,
        compatibility_flags: settings.compatibility_flags || [],
        bindings: Array.isArray(settings.bindings)
          ? settings.bindings.map((b) => ({ name: b.name || null, type: b.type || null, service: b.service || null, environment: b.environment || null }))
          : [],
      };
    } catch (error) {
      entry.errors.push(error instanceof Error ? error.message : String(error));
    }
    report.workers[worker] = entry;
  }

  for (const [key, apiPath] of Object.entries({
    d1: "/accounts/" + accountId + "/d1/database",
    r2: "/accounts/" + accountId + "/r2/buckets",
  })) {
    try {
      const result = await cf(apiPath);
      report.accountResources[key] = Array.isArray(result)
        ? result.map((item) => ({ id: item.uuid || item.id || null, name: item.name || null }))
        : result;
    } catch (error) {
      report.errors.push(error instanceof Error ? error.message : String(error));
    }
  }
}

await fs.mkdir("outputs", { recursive: true });
await fs.writeFile("outputs/cloudflare-runtime-audit.json", JSON.stringify(report, null, 2) + "\n");

console.log("Cloudflare credentials available:", report.credentialsAvailable);
console.log("Zone:", report.zone?.name || "unavailable");
console.log("Routes found:", report.routes.length);
for (const item of report.publicRuntime || []) console.log("PUBLIC", item.pathname, "prod=", item.production.status, "origin=", item.directOrigin.status, "sameBody=", item.sameBody, "prodHeaders=", JSON.stringify(item.production.headers || {}), "originHeaders=", JSON.stringify(item.directOrigin.headers || {}));
for (const route of report.routes) console.log(route.pattern, "->", route.script || "(no script)");
for (const [worker, data] of Object.entries(report.workers)) {
  console.log(worker, "deployments=", Array.isArray(data.deployments) ? data.deployments.length : 0, "bindings=", data.settings?.bindings?.length || 0, "errors=", data.errors.length);
}
if (report.errors.length) {
  console.log("Account-level audit errors:");
  for (const error of report.errors) console.log("-", error);
}
