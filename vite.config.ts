import vinext from "vinext";
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";
import { psrCssOptimizer } from "./build/psr-css-optimizer";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  // Keep the preview runtime on the newest date supported by the bundled local
  // workerd binary. Production continues to use wrangler.jsonc.
  compatibility_date: "2026-07-28",
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
  durable_objects: {
    bindings: [
      {
        name: "SONU_PUBLIC_AGENT",
        class_name: "SonuPublicAgent",
      },
    ],
  },
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      {
        name: "psr-vite-env-dev-compat",
        apply: "serve",
        configureServer(server) {
          const envClientPath = join(process.cwd(), "node_modules/vite/dist/client/env.mjs");
          server.middlewares.use("/node_modules/vite/dist/client/env.mjs", (_request, response) => {
            const source = readFileSync(envClientPath, "utf8").replace("__DEFINES__", JSON.stringify({ "process.env.NODE_ENV": "development" }));
            response.setHeader("Content-Type", "text/javascript");
            response.end(source);
          });
        },
      },
      psrCssOptimizer(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        // Development uses isolated placeholders. Production builds read the
        // real, PSR-only bindings from wrangler.jsonc so Vinext cannot merge a
        // duplicate DB or Durable Object into the deploy artifact.
        config: command === "serve"
          ? localBindingConfig
          : { main: "./worker/index.ts", compatibility_date: "2026-08-20" },
      }),
    ],
  };
});
