# PSR Homes

> **Repository status — 24 September 2026**
>
> This is the **public source-authority repository** for PSR Homes (`psrhomes.ae`). It is still incomplete: the full primary Worker application and companion Worker source trees have not yet all been reconciled from production.
>
> **AI ownership:** **Sonu belongs to PSR Homes only.** Grace belongs to Haus & Grace only. Espacios AI/Aether belongs to Espacios only.
>
> **Release blocker:** the checked-in primary Wrangler manifest still contains the legacy Durable Object names `GracePublicAgent` / `GRACE_PUBLIC_AGENT`. Do not deploy that naming as the final tenant architecture. The rename to Sonu must be done together with the actual Durable Object source and a Cloudflare-verified migration plan.
>
> See [the platform audit](docs/platform-audit-2026-09-24.md), [tenant boundary](docs/tenant-boundary.md), and [security policy](SECURITY.md).

## Primary production identity

- Domain: `psrhomes.ae` / `www.psrhomes.ae`
- Primary Worker: `psr-property`
- AI/agent: **Sonu**
- Supabase PSR API source mirrored in this repo: `supabase/functions/psr-ai-api/`

## Companion Workers recorded in the current architecture

- `psr-home-edge`
- `psr-media-edge`
- `psr-roadshow-dates`
- `psr-roadshow-brochure`
- `psr-roadshow-plan`
- `psr-roadshow-nurture`
- `psr-projects-clean`
- `psr-shell-events`

Not all companion Worker sources are present yet. Cloudflare Builds must remain disabled for any Worker whose complete source tree is missing.

## Source-of-truth rule

Target operating model:

```text
GitHub reviewed source
        ↓
CI / release gate
        ↓
Cloudflare + Supabase
        ↓
psrhomes.ae
        ↓
Sonu
```

Runtime secret values stay in Cloudflare/Supabase secret stores and must never be committed to this public repository.
