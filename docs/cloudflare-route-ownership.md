# PSR Cloudflare route ownership

Verified against the live Cloudflare account and public runtime on 24 September 2026.

## Observed production chain

The public apex and `www` wildcard routes are owned by `psr-media-edge`.

```text
psrhomes.ae/*
www.psrhomes.ae/*
      ↓
psr-media-edge
      ├─ /                 → psr-home-video-guard
      ├─ /events/roadshow* → psr-sg26-clean + roadshow services
      ├─ /projects         → psr-projects-clean
      └─ remaining shell   → psr-shell-events / origin chain

psrhomes.ae/advisors/jumanah/dubai-south*
      ↓
psr-jumanah-presentation-edge

psr.espacios.me
      ↓
psr-property direct origin
```

A narrower live route was also observed:

- `www.psrhomes.ae/api/sg26/registrations` → `psr-property`

The apex registration path is handled by the SG26 chain.

## Manifest policy

- `wrangler.media-edge.jsonc` owns the two public wildcard routes.
- `wrangler.jsonc` is the `psr-property` origin and retains the direct custom domain plus the observed narrower registration route.
- `wrangler.home-edge.jsonc` is service-only and declares no public route.
- `wrangler.jumanah-presentation-edge.jsonc` retains its narrower route.
- More-specific legacy/redundant zone routes must be classified before deletion; the wildcard manifests are the intended canonical source ownership.

## Live media-edge service bindings

| Binding | Live service |
|---|---|
| `HOME` | `psr-home-video-guard` |
| `ROADSHOW` | `psr-sg26-clean` |
| `ROADSHOW_BROCHURE` | `psr-roadshow-brochure` |
| `ROADSHOW_PLAN` | `psr-roadshow-plan` |
| `ROADSHOW_NURTURE` | `psr-roadshow-nurture` |
| `PROJECTS` | `psr-projects-clean` |
| `SHELL` | `psr-shell-events` |

The old checked-in `ROADSHOW → psr-roadshow-dates` service binding was stale. `psr-roadshow-dates` still owns several direct SG26/assets routes, but it is not the live `ROADSHOW` service behind `psr-media-edge`.

## Sonu deployment sequencing

Production still stores the Durable Object namespace under the class name `GracePublicAgent`.

The first Sonu origin deployment is therefore a compatibility release:

- application binding: `SONU_PUBLIC_AGENT`
- existing class: `GracePublicAgent`
- no `renamed_classes` migration in the normal production manifest

The manual workflow **Deploy PSR Origin / Sonu Compatibility** requires `DEPLOY-SONU-COMPAT` and blocks if a class-rename migration is present.

Only after continuity is verified should a separate, explicitly reviewed class-rename release migrate `GracePublicAgent` to `SonuPublicAgent`.

## Runtime audit credentials

The repository's read-only Cloudflare audit can enumerate exact routes, Worker deployments/bindings, build configuration, D1 metadata and R2 metadata when these GitHub Actions secrets are configured:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Use a read-only token for the audit. Do not put either value in a public file or pull request.
