import { writeFile } from "node:fs/promises";

const token = process.env.CLOUDFLARE_API_TOKEN || "";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
if (!token || !accountId) {
  console.error("Cloudflare audit credentials are not configured in GitHub Actions.");
  console.error("Required repository secrets: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.");
  process.exit(2);
}

const API = "https://api.cloudflare.com/client/v4";
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const workerNames = [
  "psr-property",
  "psr-media-edge",
  "psr-home-edge",
  "psr-home-video-guard",
  "psr-roadshow-dates",
  "psr-roadshow-brochure",
  "psr-roadshow-plan",
  "psr-roadshow-nurture",
  "psr-projects-clean",
  "psr-shell-events",
  "psr-jumanah-presentation-edge",
];

async function cf(path) {
  const response = await fetch(API + path, { headers });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok && body?.success !== false, status: response.status, body };
}

function slimBinding(binding) {
  const allowed = [
    "name", "type", "namespace", "service", "environment", "class_name",
    "bucket_name", "database_name", "id", "queue_name", "index_name"
  ];
  return Object.fromEntries(allowed.filter((key) => binding?.[key] !== undefined).map((key) => [key, binding[key]]));
}

function slimError(result) {
  if (result.ok) return null;
  return {
    status: result.status,
    errors: Array.isArray(result.body?.errors)
      ? result.body.errors.map(({ code, message }) => ({ code, message }))
      : [],
  };
}

const zoneLookup = await cf("/zones?name=psrhomes.ae&status=active&per_page=5");
const zone = zoneLookup.ok ? zoneLookup.body?.result?.[0] : null;
const routesResult = zone?.id ? await cf(`/zones/${zone.id}/workers/routes`) : null;

const workers = {};
for (const name of workerNames) {
  const [settings, deployments, versions, secrets] = await Promise.all([
    cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/settings`),
    cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/deployments`),
    cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/versions?per_page=10`),
    cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/secrets`),
  ]);

  workers[name] = {
    exists: settings.ok || deployments.ok || versions.ok,
    settings: settings.ok ? {
      compatibility_date: settings.body?.result?.compatibility_date ?? null,
      compatibility_flags: settings.body?.result?.compatibility_flags ?? [],
      bindings: (settings.body?.result?.bindings || []).map(slimBinding),
      observability: settings.body?.result?.observability ?? null,
    } : null,
    settingsError: slimError(settings),
    deployments: deployments.ok
      ? (deployments.body?.result?.deployments || deployments.body?.result || []).slice(0, 10).map((d) => ({
          id: d.id ?? null,
          created_on: d.created_on ?? d.created_at ?? null,
          source: d.source ?? null,
          strategy: d.strategy ?? null,
          versions: (d.versions || []).map((v) => ({
            version_id: v.version_id ?? v.id ?? null,
            percentage: v.percentage ?? null,
          })),
        }))
      : [],
    deploymentsError: slimError(deployments),
    versions: versions.ok
      ? (versions.body?.result?.items || versions.body?.result || []).slice(0, 10).map((v) => ({
          id: v.id ?? null,
          number: v.number ?? null,
          created_on: v.created_on ?? v.created_at ?? null,
          annotations: v.annotations ?? null,
          named_handlers: v.resources?.script?.named_handlers ?? [],
        }))
      : [],
    versionsError: slimError(versions),
    secretNames: secrets.ok
      ? (secrets.body?.result || []).map((s) => ({ name: s.name, type: s.type }))
      : [],
    secretsError: slimError(secrets),
  };
}

const routeList = routesResult?.ok
  ? (routesResult.body?.result || []).map(({ id, pattern, script }) => ({ id, pattern, script }))
  : [];

const wildcardRoutes = routeList.filter((route) =>
  route.pattern === "psrhomes.ae/*" || route.pattern === "www.psrhomes.ae/*"
);
const exactHomeRoutes = routeList.filter((route) =>
  route.pattern === "psrhomes.ae/" || route.pattern === "www.psrhomes.ae/"
);
const roadshowRoutes = routeList.filter((route) => route.pattern.includes("/events/roadshow"));
const projectRoutes = routeList.filter((route) => /\/projects\*?$|\/projects\/?$/.test(route.pattern));
const jumanahRoutes = routeList.filter((route) => route.pattern.includes("/advisors/jumanah/dubai-south"));

const report = {
  auditedAt: new Date().toISOString(),
  zone: zone ? { id: zone.id, name: zone.name, status: zone.status } : null,
  zoneLookupError: slimError(zoneLookup),
  routesError: routesResult ? slimError(routesResult) : { status: 0, errors: [{ message: "zone unavailable" }] },
  routes: routeList,
  routeOwnership: {
    wildcardRoutes,
    exactHomeRoutes,
    roadshowRoutes,
    projectRoutes,
    jumanahRoutes,
  },
  workers,
};

await writeFile("cloudflare-audit.json", JSON.stringify(report, null, 2) + "\n");

console.log("Cloudflare audit summary");
console.log(JSON.stringify({
  zone: report.zone,
  routeCount: routeList.length,
  routeOwnership: report.routeOwnership,
  workers: Object.fromEntries(Object.entries(workers).map(([name, value]) => [name, {
    exists: value.exists,
    bindings: value.settings?.bindings || [],
    latestDeployment: value.deployments?.[0] || null,
    latestVersion: value.versions?.[0] || null,
    secretNames: value.secretNames,
    errors: {
      settings: value.settingsError,
      deployments: value.deploymentsError,
      versions: value.versionsError,
      secrets: value.secretsError,
    },
  }])),
}, null, 2));

if (!zone || !routesResult?.ok) process.exitCode = 1;
if (!wildcardRoutes.length) {
  console.error("No live wildcard psrhomes.ae Worker route was found.");
  process.exitCode = 1;
}
