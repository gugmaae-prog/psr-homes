# PSR Homes

> **Repository status — 24 September 2026**
>
> This is the public source-authority repository for PSR Homes (`psrhomes.ae`).
>
> The primary application source is now present. The remaining release blocker is **runtime parity for the multi-Worker Cloudflare topology**: several live companion Workers still need canonical source provenance/backfill before GitHub can safely become the automatic production deploy source.
>
> **AI ownership:** Sonu belongs to PSR Homes only. Grace belongs to Haus & Grace only. Espacios AI/Aether belongs to Espacios only.
>
> Production still stores the PSR Durable Object namespace under the historical class name `GracePublicAgent`. The reconciliation plan keeps that namespace intact while Sonu application code uses a Sonu-named binding, then performs the class rename as a separate stateful release.
>
> See [the platform audit](docs/platform-audit-2026-09-24.md), [live Cloudflare topology](docs/cloudflare-live-topology-2026-09-24.md), [Sonu migration plan](docs/sonu-migration.md), [tenant boundary](docs/tenant-boundary.md), and [security policy](SECURITY.md).

## Primary production identity

- Domain: `psrhomes.ae` / `www.psrhomes.ae`
- Public wildcard edge: `psr-media-edge`
- Primary application/origin Worker: `psr-property`
- Direct origin/custom domain: `psr.espacios.me`
- AI/agent: **Sonu**
- D1: `cba-property-db`
- R2: `psr-property-media`
- Supabase PSR API source: `supabase/functions/psr-ai-api/`

## Live edge/service graph

The live public wildcard routes are owned by `psr-media-edge`, not directly by `psr-property`.

Critical downstream services currently include:

- `psr-home-video-guard`
- `psr-sg26-clean`
- `psr-roadshow-brochure`
- `psr-roadshow-plan`
- `psr-roadshow-nurture`
- `psr-projects-clean`
- `psr-shell-events`

`psr-roadshow-dates` still owns multiple SG26/assets routes but is not the current `ROADSHOW` service binding behind `psr-media-edge`.

## Source parity

Present in this repository:

- primary Next/Workers application;
- Sonu application/agent implementation;
- `psr-media-edge` source;
- `psr-home-edge` source;
- Jumanah presentation edge source;
- D1/Drizzle migrations;
- Supabase PSR function/migrations;
- CI, guardrails, media acceptance, and runtime audit tooling.

Still requiring canonical source provenance/backfill:

- `psr-home-video-guard`
- `psr-sg26-clean`
- `psr-roadshow-dates`
- `psr-roadshow-brochure`
- `psr-roadshow-plan`
- `psr-roadshow-nurture`
- `psr-projects-clean`
- `psr-shell-events`

The account contains additional PSR-prefixed utilities, previews, map Workers, media Workers, and migration tools. They must be classified before cleanup.

## Deployment rule

Cloudflare Builds are intentionally **not connected to production** yet.

Target operating model:

```text
GitHub reviewed source
        ↓
CI + guardrails + media acceptance
        ↓
read-only Cloudflare topology audit
        ↓
preview / staging
        ↓
runtime verification + rollback check
        ↓
manual production promotion
        ↓
Cloudflare
        ↓
psrhomes.ae
        ↓
Sonu
```

Automatic production deployment should only be enabled after the runtime audit reports zero unexplained drift and every required production Worker has a canonical source authority.

Runtime secret values stay in Cloudflare/Supabase secret stores and must never be committed to this public repository.
