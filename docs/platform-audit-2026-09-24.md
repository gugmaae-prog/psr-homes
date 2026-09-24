# PSR Homes Platform Audit — 24 September 2026

## Executive summary

- GitHub repository: `gugmaae-prog/psr-homes`
- Visibility: **public**
- Reconciliation base commit: `3464aa9c863ec86c8353327c899ad689a9469973`
- Primary application source: **present**
- GitHub Actions: source CI, repository guardrails, production-media acceptance, and runtime-audit workflow are present
- Production domain: `psrhomes.ae`
- Cloudflare model: **Workers**, not Pages
- Live PSR-prefixed Workers found: **39**
- Live Worker routes found on the PSR zone: **86**
- Public wildcard edge owner: **`psr-media-edge`**
- Primary application Worker: `psr-property`
- Canonical PSR AI/agent identity: **Sonu**
- Live Durable Object class identity: **`GracePublicAgent`** pending a state-preserving migration
- Cloudflare Builds: not configured for the audited `psr-property`, `psr-media-edge`, and `psr-home-edge` Workers
- Automatic production deployment remains blocked until source parity and runtime drift are fully reconciled

See `docs/cloudflare-live-topology-2026-09-24.md` for the detailed Cloudflare snapshot.

## Repository status

The repository is no longer a scaffold. The lean production application source is present, including:

- `app/`
- `components/`
- `lib/`
- `worker/`
- `data/`
- `db/`
- `scripts/`
- `tests/`
- Wrangler manifests
- Supabase migration/function source

The `public/` asset tree is intentionally not treated as the primary media authority; production media is substantially R2-backed.

The latest production-media gate covers the R2 external-media manifest and brochure readiness in addition to source-referenced media.

## GitHub CI status

At the time of reconciliation, the current source line had passing runs for:

- Repository guardrails
- Source CI
- Production Media Acceptance

The runtime audit workflow exists but needs repository Cloudflare credentials before it can perform the full account inventory itself.

## Cloudflare live topology

The connected Cloudflare account was inspected directly.

### Zone

- `psrhomes.ae`: active
- Pages project for PSR: none found
- production is routed through Workers

### Public edge

The live root wildcard routes are:

- `psrhomes.ae/*` → `psr-media-edge`
- `www.psrhomes.ae/*` → `psr-media-edge`

This is materially different from the earlier checked-in primary Wrangler manifest, which claimed those wildcard routes for `psr-property`.

The reconciliation branch narrows `psr-property` to its live direct route and leaves wildcard ownership with `psr-media-edge`.

### Primary Worker

`psr-property` exists and has the expected major resources:

- D1 `cba-property-db`
- R2 `psr-property-media`
- Workers AI
- Images
- assets
- email send binding
- inbox configuration
- cron `17 */6 * * *`
- observability

The live Worker was most recently deployed through API/Wrangler flows rather than GitHub Builds.

### Media edge

The live `psr-media-edge` service graph includes:

- `HOME` → `psr-home-video-guard`
- `ROADSHOW` → `psr-sg26-clean`
- `ROADSHOW_BROCHURE` → `psr-roadshow-brochure`
- `ROADSHOW_PLAN` → `psr-roadshow-plan`
- `ROADSHOW_NURTURE` → `psr-roadshow-nurture`
- `PROJECTS` → `psr-projects-clean`
- `SHELL` → `psr-shell-events`

The repository previously recorded `ROADSHOW → psr-roadshow-dates`; that drift is corrected on the reconciliation branch.

## Sonu and Durable Object migration

The product identity is already Sonu throughout the active application source.

Production state is still attached to:

- binding: `GRACE_PUBLIC_AGENT`
- class: `GracePublicAgent`

The source exports:

- `SonuPublicAgent`
- temporary compatibility alias `GracePublicAgent`

The previous main-branch manifest had already staged an explicit `GracePublicAgent → SonuPublicAgent` class migration before the live account had been fully reconciled.

The safer sequence is now:

1. keep the live class/namespace unchanged;
2. expose that existing class to application code through the `SONU_PUBLIC_AGENT` binding name;
3. verify production state continuity;
4. perform the explicit class rename only as a separate release;
5. remove the compatibility alias only after rollback and cross-Worker checks.

This prevents route reconciliation and state migration from occurring in the same production release.

## Companion Worker source gap

The primary source is present, but the complete live service graph is not yet represented as reviewed source in this repository.

At minimum, source provenance still needs to be established for:

- `psr-home-video-guard`
- `psr-sg26-clean`
- `psr-roadshow-dates`
- `psr-roadshow-brochure`
- `psr-roadshow-plan`
- `psr-roadshow-nurture`
- `psr-projects-clean`
- `psr-shell-events`

These Workers are not optional from a deployment-topology perspective because `psr-media-edge` depends on several of them through service bindings.

## PSR Worker sprawl

There are 39 `psr-` prefixed Workers in the account. They include:

- production application/edge Workers;
- roadshow Workers;
- static/media Workers;
- migration/repair Workers;
- preview Workers;
- map Workers;
- administrative/utility Workers.

This must be classified before cleanup. A Worker with no zone route may still be in use through a service binding, custom domain, schedule, or administrative flow.

## Map tenant boundary

Architecture policy assigns the map platform to Espacios, but the Cloudflare account still includes active `psr-portfolio-map*` and `psr-map-*` Workers and `psrhomes.ae/map*` routing.

Do not delete those Workers merely because their naming conflicts with the desired tenant boundary. First move or proxy the production dependency intentionally, verify the public route, then retire the PSR-named runtime.

## Supabase PSR foundation

Shared project:

- organization: `espacios.me`
- project: `entity`
- region: Singapore
- Postgres 17.6

PSR tables include:

- `psr_projects`
- `psr_units`
- `psr_knowledge_chunks`
- `psr_leads`
- `psr_conversations`
- `psr_messages`
- `psr_recommendations`
- `psr_events`
- `psr_event_registrations`

The audited PSR policies deny direct anonymous/authenticated table access. The PSR Edge Function source is mirrored in `supabase/functions/psr-ai-api/`.

## Shared Supabase platform risk

The shared Supabase project still carries platform-level debt outside the PSR tables, including permissive legacy policies, SECURITY DEFINER/search-path issues, unindexed foreign keys, and noisy callers.

Those findings do not mean the PSR tables themselves are open, but they increase the blast radius of keeping unrelated tenants in one project.

A dedicated PSR Supabase project remains a valid isolation target after Cloudflare source parity is complete.

## Cloudflare Builds

No build configuration was attached to the audited core Workers.

This is currently protective: pushing to `main` does not automatically rewrite production Worker routing.

Do not enable production Builds until:

- the runtime audit is credentialed in GitHub Actions;
- the audit reports zero unexplained topology drift;
- all required companion Worker sources have a source authority;
- staging/preview deployment has passed;
- the Sonu compatibility release has passed;
- the class rename release is separately approved.

## Required remediation order

1. merge the live-route/service reconciliation;
2. credential the read-only Cloudflare runtime audit in GitHub Actions;
3. backfill or formally externalize required companion Worker sources;
4. create a staging/preview release path;
5. deploy and verify the Sonu binding compatibility bridge;
6. perform the Durable Object class rename as its own release;
7. classify and clean temporary/preview/migration Workers;
8. migrate the map runtime to its intended Espacios ownership boundary without breaking `/map`;
9. decide whether PSR should move to a dedicated Supabase project;
10. connect GitHub → Cloudflare production Builds only after the release gate is green.
