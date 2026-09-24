# PSR Cloudflare deployment

> **Production release gate:** automatic deployment remains disabled until GitHub and the live Cloudflare topology reach verified parity.

## Current production shape

Production is Worker-routed, not Cloudflare Pages.

- Domain: `psrhomes.ae`
- Public wildcard edge: `psr-media-edge`
- Primary application/origin Worker: `psr-property`
- Direct origin/custom domain: `psr.espacios.me`
- D1: `cba-property-db`
- R2: `psr-property-media`
- Workers AI + Images
- Email receive domain: `inbox.psrhomes.ae`
- Email sending enabled
- Campaign delivery disabled
- Primary cron: `17 */6 * * *`

## Route ownership

The live wildcard routes are owned by `psr-media-edge`:

- `psrhomes.ae/*`
- `www.psrhomes.ae/*`

Do **not** deploy `psr-property` with those wildcard routes.

The reconciliation manifest retains only the direct `www.psrhomes.ae/api/sg26/registrations` route observed for `psr-property` plus the direct custom domain.

## Media edge service graph

Production `psr-media-edge` currently binds to:

- `HOME` → `psr-home-video-guard`
- `ROADSHOW` → `psr-sg26-clean`
- `ROADSHOW_BROCHURE` → `psr-roadshow-brochure`
- `ROADSHOW_PLAN` → `psr-roadshow-plan`
- `ROADSHOW_NURTURE` → `psr-roadshow-nurture`
- `PROJECTS` → `psr-projects-clean`
- `SHELL` → `psr-shell-events`

## Sonu Durable Object compatibility

Sonu is the canonical PSR AI identity, but production state is still attached to the existing `GracePublicAgent` class namespace.

The production-safe intermediate manifest therefore uses:

- application binding name: `SONU_PUBLIC_AGENT`
- current class name: `GracePublicAgent`

This lets Sonu-named application code resolve the existing namespace **without performing the class rename in the same release**.

The explicit `GracePublicAgent → SonuPublicAgent` class migration is a separate release gate documented in `docs/sonu-migration.md`.

## Cloudflare Builds

At audit time, `psr-property`, `psr-media-edge`, and `psr-home-edge` did not have Cloudflare Builds configurations attached.

Keep that state until:

1. runtime-audit credentials are configured in GitHub Actions;
2. all route/service drift is resolved;
3. required companion Worker source is under version control or formally externalized;
4. a staging/preview release succeeds;
5. Sonu Durable Object compatibility is verified;
6. rollback targets are recorded.

## Deployment rule

A green source build is necessary but not sufficient for production.

Before a production deploy, verify:

- exact commit SHA;
- route ownership;
- service bindings;
- D1/R2 bindings;
- Durable Object class/binding state;
- cron/email bindings;
- required secrets by **name only**;
- runtime probes;
- rollback version.

See:

- `docs/cloudflare-live-topology-2026-09-24.md`
- `docs/platform-audit-2026-09-24.md`
- `docs/cloudflare-builds.md`
- `docs/sonu-migration.md`
- `docs/tenant-boundary.md`
