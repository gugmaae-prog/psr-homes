# Cloudflare Builds — PSR Homes

## Current state

`psr-property` is the production app. Its Wrangler file is `wrangler.jsonc` at the repository root (`name`: `psr-property`).

On 2026-09-24 the Workers Builds API listed **no builds** for that Worker.

This repository does not contain the Next.js / ViNext application tree. See `workers/psr-property/STATUS.md`. There is no test suite here. `wrangler.jsonc` sets `main` to `./dist/server/index.js`, and `/dist/` is gitignored.

Do not deploy from this seed.

## Do not enable production auto-deploy yet

Connecting a repository turns on Workers Builds for the selected production branch. A push to that branch runs the build command, then the deploy command. Cloudflare's default production deploy command is `npx wrangler deploy`, which promotes an active deployment.

**Do not enable production auto-deploy** for Worker `psr-property` until both of these are true:

1. The full Next.js / ViNext source is in `gugmaae-prog/psr-homes` (working-tree copy; no secrets; no Espacios map data).
2. Tests for that source are in the repo and passing.

Until then, do not finish **Connect** with production branch `main` and a deploy command that promotes production. Do not run a production build from this docs-only tree.

The Worker name in the dashboard must match `name` in `wrangler.jsonc` (`psr-property`). Root directory for that config is the repository root.

## Connect (only after source and tests)

Dashboard path:

**Worker `psr-property` → Settings → Builds → Connect → `gugmaae-prog/psr-homes`**

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages).
2. Select the existing Worker **psr-property**. Do not create a second Worker.
3. Open **Settings**, then **Builds**.
4. Select **Connect**.
5. Authorize GitHub if prompted.
6. Select repository **`gugmaae-prog/psr-homes`**.
7. Set the production branch to **`main`** only when the gate above is met.
8. Set the root directory to the repository root, where `wrangler.jsonc` lives.
9. Set build and deploy commands from the synced app. This seed does not define them.

Reference: [Workers Builds — connect an existing Worker](https://developers.cloudflare.com/workers/ci-cd/builds/).

## Release gate

Do not treat Builds as a production deploy until:

- Full app source is in this repo
- The exact commit is known
- Manifest, tests, and a rollback target are verified

## Companions

Do not connect Builds for companion Workers from this seed.

| Worker | Config in this repo | Source named by that config |
|--------|---------------------|-----------------------------|
| `psr-home-edge` | `wrangler.home-edge.jsonc` | `worker/home-edge.ts` (not in repo) |
| `psr-media-edge` | `wrangler.media-edge.jsonc` | `worker/media-edge.ts` (not in repo) |
| `psr-roadshow-dates` | none | none |
| `psr-projects-clean` | none | none |
| `psr-shell-events` | none | none |

Connect those only after their own sources are in this repo. Stubs: `workers/README.md`.
