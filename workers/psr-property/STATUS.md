# psr-property status

The full Next.js / ViNext application tree is **not** in this repository.

`wrangler.jsonc` names the Worker, routes, and bindings. It is not the app. No pages, components, or tests are committed here.

## Local Codex checkout

The local Codex checkout git is unhealthy. Do not use that checkout's git history as the source for the next sync.

## Next sync

Copy **working-tree** sources into this repo.

Omit:

- secrets and `.env` values (`.gitignore` already ignores `.env*` except `.env.example`)
- Espacios map Workers, map assets, hotspots, and any map data

Do not deploy from this seed. Workers Builds production auto-deploy stays off until that source is here and tests pass. See `docs/cloudflare-builds.md`.
