# PSR Workers

## Production incident note — 25 September 2026

A production compatibility regression was repaired directly in Cloudflare after a source/runtime reconciliation deploy:

- `psr-portfolio-map-v2` was routed from `psrhomes.ae/map*` but the deployed Worker rejected every hostname except `espacios.me`, causing the complete PSR map surface and map APIs to return 404. The live Worker now accepts `psrhomes.ae`, `www.psrhomes.ae`, `psr.espacios.me`, and `espacios.me`.
- `psr-media-edge` still targeted legacy `.grace-chat` / `.grace-chat-launcher` selectors after the origin application moved to Sonu. The live Worker now supports both Sonu and Grace selectors during the compatibility window.
- The checked-in `worker/media-edge.ts` is not yet byte-for-byte source parity with the live Worker; production contains additional runtime repair logic. **Do not deploy the current repository media-edge source over production until the live bundle is fully backfilled/reconciled.**
- Do not remove the Sonu compatibility bridge or apply the Durable Object class rename as part of an unrelated release.

Verified after the repair: homepage, projects, developers, communities, insights, events, agent entry, logos, robots, sitemap, `/map`, `/map/app-v2.js`, `/map/map-core.json`, and `/map/api/projects-all` all return successful Cloudflare production status.


The PSR Cloudflare account is a multi-Worker application. `psr-property` is the primary application/origin, while `psr-media-edge` owns the public apex/`www` wildcard routes.

The full verified Cloudflare snapshot is in `docs/cloudflare-live-topology-2026-09-24.md`.

## Source present in this repository

| Worker | Source / manifest | Role |
|---|---|---|
| `psr-property` | root app + `worker/index.ts` + `wrangler.jsonc` | primary application/origin |
| `psr-media-edge` | `worker/media-edge.ts` + `wrangler.media-edge.jsonc` | public wildcard edge, media/project/roadshow routing |
| `psr-home-edge` | `worker/home-edge.ts` + `wrangler.home-edge.jsonc` | older homepage edge/origin transform path |
| `psr-jumanah-presentation-edge` | `worker/jumanah-presentation-edge.ts` + dedicated Wrangler config | private Jumanah/Dubai South presentation edge |

The main application tree includes `app/`, `components/`, `lib/`, `worker/`, `data/`, `db/`, `scripts/`, and `tests/`.

## Live service dependencies still requiring source provenance/backfill

The live `psr-media-edge` service graph depends on Workers whose canonical source is not yet established in this repository:

| Live Worker | Why it matters |
|---|---|
| `psr-home-video-guard` | `HOME` service used by `psr-media-edge` |
| `psr-sg26-clean` | live `ROADSHOW` service |
| `psr-roadshow-brochure` | brochure route/service |
| `psr-roadshow-plan` | roadshow planning route/service |
| `psr-roadshow-nurture` | nurture/unsubscribe route/service |
| `psr-projects-clean` | projects index service |
| `psr-shell-events` | events shell service |
| `psr-roadshow-dates` | still owns multiple SG26/assets routes even though it is no longer the live `ROADSHOW` service binding |

These Workers must be backfilled from their verified production source or formally assigned to another canonical repository before automatic production Builds are enabled.

## Other live PSR-prefixed Workers

The audit found **39** `psr-` Workers in total. In addition to the primary/service Workers, the account contains:

### Events / roadshow / services

- `psr-events-hub`
- `psr-events-theme`
- `psr-roadshow-beta`
- `psr-services-edge`
- `psr-sg26-light-r2`

### Media / static / brand / logos

- `psr-advisor-images`
- `psr-brand-discovery`
- `psr-logos-gallery`
- `psr-static-media`
- `psr-social-calendar`

### Migration / repair utilities

- `psr-all-image-migrator`
- `psr-d1-image-migrator`
- `psr-document-migrator`
- `psr-image-finalizer`
- `psr-image-retry`

Do not delete these solely because they look temporary. First verify whether each still has a zone route, service binding, custom domain, schedule, or operational use.

## Map boundary

The account also contains:

- `psr-portfolio-map`
- `psr-portfolio-map-v2`
- `psr-map-assets-preview`
- `psr-map-collapse-preview`
- `psr-map-controls-preview`
- `psr-map-controls-preview2`
- `psr-map-controls-preview3`
- `psr-map-controls-preview4`
- `psr-map-controls-preview5`
- `psr-map-smooth-preview`
- `psr-map-smooth-preview2`
- `psr-map-ui-preview`

Architecture policy places the map platform under Espacios, but `psrhomes.ae/map*` is still live and uses PSR-named map Workers.

Therefore the correct action is **migration, not deletion**:

1. identify the canonical Espacios map Worker/source;
2. reproduce the existing PSR map behavior there;
3. route or proxy `psrhomes.ae/map*` to the intended runtime;
4. verify parity/performance;
5. only then retire redundant PSR map Workers.

## Production route rule

Do not assign `psrhomes.ae/*` or `www.psrhomes.ae/*` to `psr-property` while `psr-media-edge` is the live public edge.

Any Worker manifest added here must be reconciled against the read-only Cloudflare runtime audit before it becomes deployable.

## Cloudflare Builds rule

No core production Worker should receive a GitHub Build connection until:

- its source is complete;
- its routes/bindings are represented accurately;
- staging/preview succeeds;
- rollback is recorded;
- the runtime audit reports zero unexplained drift.
