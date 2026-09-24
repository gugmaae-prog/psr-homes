# PSR Homes

Private source authority for **PSR Homes** (`psrhomes.ae`) — Cloudflare Workers, site, roadshow, and property surfaces.

Created as the per-brand GitHub repo (Espacios multi-tenant split). Tenants stay separate: do **not** import Espacios map data or Haus & Grace private CRM/staff/leads.

## Primary Worker

- `psr-property` — main ViNext/Next.js app (routes on `psrhomes.ae`)

## Companion Workers (PSR-owned, non-map)

- `psr-home-edge`
- `psr-media-edge`
- `psr-roadshow-dates`
- `psr-projects-clean`
- `psr-shell-events`

Map Workers and Espacios hotspots are **out of scope** for this repo.

## Status

Initial seed. The full Next.js / ViNext app tree is **not** in this repo. The local Codex checkout git is unhealthy; the next sync must copy working-tree sources and must omit secrets and map data.

See `workers/psr-property/STATUS.md`.

## Cloudflare Builds

When source and tests are in this repo: Cloudflare Dashboard → Worker `psr-property` → Settings → Builds → Connect → `gugmaae-prog/psr-homes` (branch `main`).

Do not enable production auto-deploy before that. See `docs/cloudflare-builds.md` and `docs/tenant-boundary.md`.
