import { promises as fs } from "node:fs";

const token = process.env.CLOUDFLARE_API_TOKEN || "";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const zoneName = process.env.CLOUDFLARE_ZONE_NAME || "psrhomes.ae";

const criticalWorkers = [
  "psr-property",
  "psr-media-edge",
  "psr-home-edge",
  "psr-home-video-guard",
  "psr-sg26-clean",
  "psr-roadshow-dates",
  "psr-roadshow-brochure",
  "psr-roadshow-plan",
  "psr-roadshow-nurture",
  "psr-projects-clean",
  "psr-shell-events",
  "psr-jumanah-presentation-edge",
];

const expectedLive = {
  rootOwners: {
    "psrhomes.ae/*": "psr-media-edge",
    "www.psrhomes.ae/*": "psr-media-edge",
  },
  propertyDirectRoute: {
    pattern: "www.psrhomes.ae/api/sg26/registrations",
    script: "psr-property",
  },
  mediaEdgeBindings: {
    HOME: "psr-home-video-guard",
    ROADSHOW: "psr-sg26-clean",
    ROADSHOW_BROCHURE: "psr-roadshow-brochure",
    ROADSHOW_PLAN: "psr-roadshow-plan",
    ROADSHOW_NURTURE: "psr-roadshow-nurture",
    PROJECTS: "psr-projects-clean",
    SHELL: "psr-shell-events",
  },
  propertyDurableObject: {
    binding: "GRACE_PUBLIC_AGENT",
    className: "GracePublicAgent",
  },
};

const report = {
  checkedAt: new Date().toISOString(),
  credentialsAvailable: Boolean(token && accountId),
  accountIdPresent: Boolean(accountId),
  zoneName,
  zone: null,
  routes: [],
  routeCounts: {},
  psrWorkerInventory: [],
  workers: {},
  accountResources: {},
  releaseGate: {
    expectedLive,
    drift: [],
    cloudflareBuilds: {},
  },
  publicRuntime: [],
  errors: [],
};

async function cf(path) {
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const details = JSON.stringify(data.errors || data);
    const error = new Error(path + " -> " + response.status + " " + details);
    error.status = response.status;
    error.cloudflareErrors = data.errors || [];
    throw error;
  }
  return data.result;
}

async function publicProbe(base, pathname) {
  const url = new URL(pathname, base).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "PSR-Cloudflare-Audit/2.0",
        accept: "text/html,*/*;q=0.8",
      },
    });
    const body = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", body);
    const sha256 = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const keep = [
      "content-type",
      "location",
      "server",
      "cf-ray",
      "x-psr-home-edge",
      "x-psr-media-cutover",
      "x-psr-media",
      "x-psr-document-cache",
    ];
    const headers = {};
    for (const name of keep) {
      const value = response.headers.get(name);
      if (value) headers[name] = value;
    }
    return {
      url,
      status: response.status,
      bytes: body.byteLength,
      sha256,
      headers,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function compactBinding(binding) {
  return {
    name: binding.name || null,
    type: binding.type || null,
    service: binding.service || null,
    environment: binding.environment || null,
    class_name: binding.class_name || null,
    bucket_name: binding.bucket_name || null,
  };
}

function routeOwner(pattern) {
  return report.routes.find((route) => route.pattern === pattern)?.script || null;
}

function serviceBindings(workerName) {
  const bindings = report.workers[workerName]?.settings?.bindings || [];
  return Object.fromEntries(
    bindings
      .filter((binding) => binding.type === "service" && binding.name)
      .map((binding) => [binding.name, binding.service || null]),
  );
}

function addDrift(code, expected, actual, detail) {
  if (expected === actual) return;
  report.releaseGate.drift.push({ code, expected, actual, detail });
}

const publicPaths = [
  "/",
  "/events/roadshow",
  "/projects",
  "/advisors/jumanah/dubai-south",
];

for (const pathname of publicPaths) {
  const production = await publicProbe("https://psrhomes.ae", pathname);
  const directOrigin = await publicProbe("https://psr.espacios.me", pathname);
  report.publicRuntime.push({
    pathname,
    production,
    directOrigin,
    sameBody: Boolean(
      production.sha256
      && directOrigin.sha256
      && production.sha256 === directOrigin.sha256
    ),
  });
}

if (!report.credentialsAvailable) {
  console.log("Cloudflare Actions credentials are not configured on this repository.");
} else {
  let allWorkers = [];

  try {
    const scripts = await cf("/accounts/" + accountId + "/workers/scripts");
    allWorkers = Array.isArray(scripts) ? scripts : [];
    report.psrWorkerInventory = allWorkers
      .filter((worker) => /^psr-/i.test(worker.id || worker.name || ""))
      .map((worker) => ({
        name: worker.id || worker.name,
        tag: worker.tag || null,
        modified_on: worker.modified_on || null,
        last_deployed_from: worker.last_deployed_from || null,
        compatibility_date: worker.compatibility_date || null,
        has_assets: Boolean(worker.has_assets),
        has_modules: Boolean(worker.has_modules),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    const zones = await cf(
      "/zones?name="
      + encodeURIComponent(zoneName)
      + "&account.id="
      + encodeURIComponent(accountId),
    );
    const zone = Array.isArray(zones) ? zones[0] : null;
    report.zone = zone
      ? { name: zone.name, status: zone.status, paused: Boolean(zone.paused) }
      : null;
    if (!zone) throw new Error("Zone not found: " + zoneName);

    report.routes = (await cf("/zones/" + zone.id + "/workers/routes")).map((route) => ({
      pattern: route.pattern,
      script: route.script || null,
    }));

    for (const route of report.routes) {
      const key = route.script || "(no script)";
      report.routeCounts[key] = (report.routeCounts[key] || 0) + 1;
    }
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  }

  for (const worker of criticalWorkers) {
    const entry = {
      deployments: null,
      settings: null,
      build: null,
      errors: [],
    };

    try {
      const deployments = await cf(
        "/accounts/" + accountId + "/workers/scripts/" + worker + "/deployments",
      );
      const list = Array.isArray(deployments?.deployments)
        ? deployments.deployments
        : Array.isArray(deployments)
          ? deployments
          : [];
      entry.deployments = list.slice(0, 5).map((deployment) => ({
        id: deployment.id,
        created_on: deployment.created_on,
        source: deployment.source,
        strategy: deployment.strategy,
        annotations: deployment.annotations || null,
      }));
    } catch (error) {
      entry.errors.push(error instanceof Error ? error.message : String(error));
    }

    try {
      const settings = await cf(
        "/accounts/" + accountId + "/workers/scripts/" + worker + "/settings",
      );
      entry.settings = {
        compatibility_date: settings.compatibility_date || null,
        compatibility_flags: settings.compatibility_flags || [],
        bindings: Array.isArray(settings.bindings)
          ? settings.bindings.map(compactBinding)
          : [],
      };
    } catch (error) {
      entry.errors.push(error instanceof Error ? error.message : String(error));
    }

    const inventory = allWorkers.find((item) => (item.id || item.name) === worker);
    if (inventory?.tag) {
      try {
        const build = await cf(
          "/accounts/" + accountId + "/builds/workers/" + inventory.tag,
        );
        entry.build = {
          configured: true,
          branch: build?.repo_connection?.branch || build?.build_configuration?.branch || null,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const noBuild = /12040|No build configuration associated/i.test(message);
        entry.build = {
          configured: false,
          reason: noBuild ? "no-build-configuration" : "lookup-failed",
        };
        if (!noBuild) entry.errors.push(message);
      }
    }

    report.workers[worker] = entry;
    report.releaseGate.cloudflareBuilds[worker] = entry.build;
  }

  try {
    const d1 = await cf("/accounts/" + accountId + "/d1/database");
    report.accountResources.d1 = (Array.isArray(d1) ? d1 : [])
      .filter((item) => item.name === "cba-property-db")
      .map((item) => ({ name: item.name, version: item.version || null }));
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    const r2 = await cf("/accounts/" + accountId + "/r2/buckets");
    const buckets = Array.isArray(r2?.buckets)
      ? r2.buckets
      : Array.isArray(r2)
        ? r2
        : [];
    report.accountResources.r2 = buckets
      .filter((item) => item.name === "psr-property-media")
      .map((item) => ({ name: item.name }));
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  }

  for (const [pattern, expectedScript] of Object.entries(expectedLive.rootOwners)) {
    addDrift(
      "route-owner",
      expectedScript,
      routeOwner(pattern),
      pattern,
    );
  }

  addDrift(
    "property-direct-route",
    expectedLive.propertyDirectRoute.script,
    routeOwner(expectedLive.propertyDirectRoute.pattern),
    expectedLive.propertyDirectRoute.pattern,
  );

  const mediaBindings = serviceBindings("psr-media-edge");
  for (const [binding, expectedService] of Object.entries(expectedLive.mediaEdgeBindings)) {
    addDrift(
      "media-edge-service-binding",
      expectedService,
      mediaBindings[binding] || null,
      binding,
    );
  }

  const propertyBindings = report.workers["psr-property"]?.settings?.bindings || [];
  const durableBinding = propertyBindings.find(
    (binding) => binding.type === "durable_object_namespace",
  );
  addDrift(
    "property-do-class",
    expectedLive.propertyDurableObject.className,
    durableBinding?.class_name || null,
    durableBinding?.name || expectedLive.propertyDurableObject.binding,
  );
}

await fs.mkdir("outputs", { recursive: true });
await fs.writeFile(
  "outputs/cloudflare-runtime-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);

console.log("Cloudflare credentials available:", report.credentialsAvailable);
console.log("Zone:", report.zone?.name || "unavailable");
console.log("PSR workers:", report.psrWorkerInventory.length);
console.log("Routes found:", report.routes.length);
console.log("Detected drift:", report.releaseGate.drift.length);

for (const item of report.publicRuntime) {
  console.log(
    "PUBLIC",
    item.pathname,
    "prod=", item.production.status,
    "origin=", item.directOrigin.status,
    "sameBody=", item.sameBody,
    "prodHeaders=", JSON.stringify(item.production.headers || {}),
    "originHeaders=", JSON.stringify(item.directOrigin.headers || {}),
  );
}

for (const [script, count] of Object.entries(report.routeCounts)) {
  console.log("ROUTES", script, count);
}

for (const [worker, data] of Object.entries(report.workers)) {
  console.log(
    worker,
    "deployments=", Array.isArray(data.deployments) ? data.deployments.length : 0,
    "bindings=", data.settings?.bindings?.length || 0,
    "build=", data.build?.configured === true ? "configured" : "not-configured",
    "errors=", data.errors.length,
  );
}

if (report.releaseGate.drift.length) {
  console.log("Live topology drift:");
  for (const drift of report.releaseGate.drift) {
    console.log("-", drift.code, drift.detail, "expected=", drift.expected, "actual=", drift.actual);
  }
}

if (report.errors.length) {
  console.log("Account-level audit errors:");
  for (const error of report.errors) console.log("-", error);
}
