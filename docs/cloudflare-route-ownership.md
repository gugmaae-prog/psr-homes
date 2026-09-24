# PSR Cloudflare route ownership

Verified from the public runtime fingerprint on 24 September 2026.

## Observed production chain

The read-only runtime audit compared `https://psrhomes.ae` with the direct
`https://psr.espacios.me` origin.

| Path | Production signal | Direct origin | Interpretation |
|---|---|---|---|
| `/` | `x-psr-media-cutover: r2-v2` and `x-psr-home-edge: 3` | origin response without those edge headers | media edge is outermost; home edge is downstream |
| `/events/roadshow` | 200 with `x-psr-media-cutover: r2-v2` | 404 | roadshow is supplied by the media-edge service chain |
| `/projects` | 200 with `x-psr-media-cutover: r2-v2` | 200 but different body | projects route passes through the media edge |
| `/advisors/jumanah/dubai-south` | 200 without media-cutover header | 200 but different body | the narrower Jumanah edge route takes precedence over the wildcard |

## Canonical source topology

```text
psrhomes.ae/*
      ↓
psr-media-edge
      ├─ /                 → HOME service chain
      ├─ /events/roadshow* → roadshow services
      ├─ /projects         → psr-projects-clean
      └─ everything else   → psr-shell-events / origin chain

psrhomes.ae/advisors/jumanah/dubai-south*
      ↓
psr-jumanah-presentation-edge

psr.espacios.me
      ↓
psr-property direct origin
```

## Manifest policy

- `wrangler.media-edge.jsonc` owns the two public wildcard routes.
- `wrangler.jsonc` is the `psr-property` origin and keeps only the direct
  `psr.espacios.me` custom domain.
- `wrangler.home-edge.jsonc` is service-only and declares no public route.
- `wrangler.jumanah-presentation-edge.jsonc` retains its narrower route.

This removes duplicate route ownership from source configuration.

## Remaining authenticated verification

The repository's read-only Cloudflare audit can enumerate exact route IDs,
Worker deployments, bindings, D1 databases and R2 buckets once these GitHub
Actions secrets are configured:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Do not put either value in a public file or pull request.
