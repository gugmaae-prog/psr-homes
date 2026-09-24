# Cloudflare live topology — PSR Homes

Snapshot date: **24 September 2026**

This document records the live Cloudflare topology verified during the GitHub/Cloudflare reconciliation. It is intentionally descriptive: it does not itself authorize a production deployment.

## Zone and deployment model

- Zone: `psrhomes.ae`
- Zone status: active
- Hosting model: **Cloudflare Workers**, not Cloudflare Pages
- Primary application Worker: `psr-property`
- Public wildcard edge owner: **`psr-media-edge`**
- Direct origin/custom domain retained by the application: `psr.espacios.me`
- Cloudflare Builds: no build configuration was attached to `psr-property`, `psr-media-edge`, or `psr-home-edge` at audit time
- Recent production deployments were API/Wrangler driven rather than GitHub Builds driven

## Critical route ownership

The live zone routes make `psr-media-edge` the public edge for the apex and `www` wildcard routes:

- `psrhomes.ae/*` → `psr-media-edge`
- `www.psrhomes.ae/*` → `psr-media-edge`

The primary Worker is therefore an origin/service Worker for normal site traffic. The direct zone route observed for `psr-property` was:

- `www.psrhomes.ae/api/sg26/registrations` → `psr-property`

The apex registration endpoint is handled by the SG26 stack rather than directly by `psr-property`.

This means a production Wrangler manifest that claims `psrhomes.ae/*` or `www.psrhomes.ae/*` for `psr-property` is **not live-topology compatible** and can displace the edge router.

## `psr-media-edge` live service bindings

Verified production bindings:

| Binding | Live service |
|---|---|
| `HOME` | `psr-home-video-guard` |
| `ROADSHOW` | `psr-sg26-clean` |
| `ROADSHOW_BROCHURE` | `psr-roadshow-brochure` |
| `ROADSHOW_PLAN` | `psr-roadshow-plan` |
| `ROADSHOW_NURTURE` | `psr-roadshow-nurture` |
| `PROJECTS` | `psr-projects-clean` |
| `SHELL` | `psr-shell-events` |

The checked-in `ROADSHOW → psr-roadshow-dates` binding was stale and is corrected by the reconciliation branch.

## `psr-property` live resources

Verified production resources include:

- D1: `cba-property-db`
- R2: `psr-property-media`
- Workers AI
- Cloudflare Images
- asset binding
- email sending binding
- inbox enabled for `inbox.psrhomes.ae`
- `CAMPAIGN_DELIVERY_ENABLED=false`
- cron: `17 */6 * * *`
- observability/logging enabled

## Durable Object state

Production still uses the pre-Sonu class identity:

- live binding: `GRACE_PUBLIC_AGENT`
- live class: `GracePublicAgent`

The product/assistant identity is **Sonu**. The repository already exports `SonuPublicAgent` and a temporary `GracePublicAgent` compatibility alias.

The reconciliation strategy is therefore:

1. align route/service topology;
2. use the Sonu application binding name against the existing `GracePublicAgent` class namespace;
3. verify stored state and conversation continuity;
4. only then perform the explicit class rename migration;
5. remove the legacy alias after rollback checks pass.

This separates a binding-name cleanup from the stateful class migration.

## PSR Worker inventory

The account contained **39 Workers with a `psr-` prefix** at audit time:

- `psr-advisor-images`
- `psr-all-image-migrator`
- `psr-brand-discovery`
- `psr-d1-image-migrator`
- `psr-document-migrator`
- `psr-events-hub`
- `psr-events-theme`
- `psr-home-edge`
- `psr-home-video-guard`
- `psr-image-finalizer`
- `psr-image-retry`
- `psr-jumanah-presentation-edge`
- `psr-logos-gallery`
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
- `psr-media-edge`
- `psr-portfolio-map`
- `psr-portfolio-map-v2`
- `psr-projects-clean`
- `psr-property`
- `psr-roadshow-beta`
- `psr-roadshow-brochure`
- `psr-roadshow-dates`
- `psr-roadshow-nurture`
- `psr-roadshow-plan`
- `psr-services-edge`
- `psr-sg26-clean`
- `psr-sg26-light-r2`
- `psr-shell-events`
- `psr-social-calendar`
- `psr-static-media`

## Live zone route counts

The zone had **86 Worker routes** in the audited snapshot, distributed as follows:

| Script | Route count |
|---|---:|
| `psr-media-edge` | 16 |
| `psr-sg26-light-r2` | 9 |
| `psr-sg26-clean` | 9 |
| `psr-roadshow-dates` | 8 |
| `psr-roadshow-brochure` | 6 |
| `psr-roadshow-beta` | 6 |
| `psr-static-media` | 5 |
| `psr-events-theme` | 4 |
| `psr-all-image-migrator` | 3 |
| `psr-portfolio-map-v2` | 2 |
| `psr-advisor-images` | 2 |
| `psr-jumanah-presentation-edge` | 2 |
| `psr-logos-gallery` | 2 |
| `psr-roadshow-nurture` | 2 |
| `psr-roadshow-plan` | 2 |
| `psr-services-edge` | 2 |
| `psr-document-migrator` | 1 |
| `psr-image-finalizer` | 1 |
| `psr-d1-image-migrator` | 1 |
| `psr-image-retry` | 1 |
| `psr-property` | 1 |
| `psr-brand-discovery` | 1 |

Workers with no zone route may still be invoked through service bindings, custom domains, cron/scheduled execution, or administrative workflows.

## Source parity status

The primary application source is now in GitHub. Source parity is **not yet complete for all live companion Workers**.

Live dependencies that still require source provenance/backfill include at least:

- `psr-home-video-guard`
- `psr-sg26-clean`
- `psr-roadshow-dates`
- `psr-roadshow-brochure`
- `psr-roadshow-plan`
- `psr-roadshow-nurture`
- `psr-projects-clean`
- `psr-shell-events`

Until each production dependency has a reviewed source location, rollback target, and release path, GitHub → Cloudflare automatic production deployment remains blocked.

## Map boundary

The live account still contains `psr-portfolio-map*` and several `psr-map-*` Workers, including active routes for `/map*`.

Architecture documentation assigns the map platform to Espacios. Those Workers must therefore be **classified and migrated deliberately**. Do not delete or reroute them merely to satisfy naming consistency while `psrhomes.ae/map` still depends on them.

## Release gates

Production automation can be enabled only after all of the following are true:

- route ownership in Git matches Cloudflare;
- service bindings in Git match Cloudflare;
- required companion Worker source is in Git or formally externalized;
- the Sonu Durable Object compatibility deployment has been verified;
- the class rename has a tested rollback path;
- a staging/preview release passes source CI and runtime probes;
- Cloudflare Build configuration is attached intentionally, not inferred;
- the live runtime audit reports zero unexplained drift.
