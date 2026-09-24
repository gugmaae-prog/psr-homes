# Cloudflare Builds — PSR Homes

## Goal

Make `gugmaae-prog/psr-homes` the reviewed source authority for PSR production **without allowing a Git push to change live Worker routing before runtime parity is proven**.

## Current status

As of 24 September 2026:

- `psr-property`: no Cloudflare Builds configuration attached
- `psr-media-edge`: no Cloudflare Builds configuration attached
- `psr-home-edge`: no Cloudflare Builds configuration attached

Production deployments are currently API/Wrangler driven.

Keep production Builds disconnected while reconciliation is in progress.

## Why direct `main → production` is blocked

The live site is not a single Worker.

The public wildcard routes are owned by `psr-media-edge`, which in turn depends on multiple companion Workers through service bindings. Several of those live dependency sources are not yet represented in this repository.

The primary Durable Object class is also still `GracePublicAgent` in production while application/product identity is Sonu.

Connecting `main` directly to production before those facts are reconciled would turn a source-control cleanup into a routing and state migration.

## Required release path

Target:

```text
reviewed GitHub source
        ↓
source CI + guardrails + media acceptance
        ↓
read-only Cloudflare topology audit
        ↓
preview / staging Worker
        ↓
runtime probes + rollback verification
        ↓
manual production promotion
        ↓
Cloudflare production Worker(s)
```

Automatic production promotion can be considered only after multiple successful manual promotions with zero unexplained runtime drift.

## Read-only runtime audit

The repository contains:

- `.github/workflows/cloudflare-runtime-audit.yml`
- `scripts/audit-cloudflare-runtime.mjs`

The workflow requires repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The token must be **read-only** and scoped only to the resources required for:

- Worker inventory/settings/deployments;
- Worker routes;
- D1 metadata;
- R2 bucket metadata;
- Worker build configuration.

Do not put secret values in repository files or workflow output.

The audit now checks:

- all `psr-` Worker inventory;
- exact wildcard route ownership;
- critical service bindings;
- live Durable Object class identity;
- whether core Workers have Builds attached;
- D1/R2 resource presence;
- public production vs direct-origin probes.

## Staging/preview rule

Do not create a staging environment by binding a preview Worker blindly to production stateful resources.

A safe preview must explicitly decide the treatment of:

- D1;
- R2;
- Durable Objects;
- email;
- LeadRat;
- scheduled jobs;
- write-capable APIs.

Durable Objects should use isolated preview state unless continuity testing is intentionally being performed against production under a controlled release procedure.

Email/campaign delivery must remain disabled in preview.

## Companion Worker requirement

Before a companion Worker receives its own Build connection, its source authority must be known.

Current live dependencies that still need source provenance/backfill include at least:

- `psr-home-video-guard`
- `psr-sg26-clean`
- `psr-roadshow-dates`
- `psr-roadshow-brochure`
- `psr-roadshow-plan`
- `psr-roadshow-nurture`
- `psr-projects-clean`
- `psr-shell-events`

## Production Build connection gate

Do not connect a production Worker until:

- its complete source is under reviewable version control;
- the Wrangler manifest matches the live route/service topology;
- required secret **names** are documented;
- CI passes;
- the runtime audit reports zero unexplained drift for that Worker;
- a preview/staging deployment passes;
- the current production version is recorded as rollback;
- the deployment order for service-bound Workers is documented.

For `psr-property`, the Sonu Durable Object compatibility bridge must also be verified before the class rename migration is allowed.

## Deployment ordering

Because `psr-media-edge` fronts several services, deployment ordering matters.

For any change that touches both the edge router and a downstream service:

1. deploy backward-compatible downstream code first;
2. verify the downstream service directly;
3. deploy the edge binding/route change;
4. verify public paths;
5. retain the previous versions until the rollback window closes.

Do not make the downstream service and edge contract incompatible in the same atomic assumption.

## Final target

When source parity is complete, each production Worker should have:

- one canonical repository;
- one reviewed manifest;
- one CI path;
- one runtime-audit entry;
- one staging/preview path;
- one documented production promotion path;
- one explicit rollback target.

Only then should GitHub → Cloudflare production automation be enabled.
