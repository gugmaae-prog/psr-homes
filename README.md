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

Initial seed commit. Full Worker app sources sync next from the local Codex checkout (known RED source-reproducibility risk historically).

## Cloudflare Builds

After sources land: Cloudflare Dashboard → Worker `psr-property` → Settings → Builds → Connect → `gugmaae-prog/psr-homes` (branch `main`).

See `docs/cloudflare-builds.md` and `docs/tenant-boundary.md`.
