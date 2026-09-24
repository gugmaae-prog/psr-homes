# PSR Cloudflare deployment

Production app Workers at `https://psrhomes.ae`, `https://www.psrhomes.ae`, and `https://psr.espacios.me`.

Declared resources (live):

- Worker: `psr-property`
- D1: `cba-property-db`
- R2: `psr-property-media`
- Durable Object: `GracePublicAgent`
- Workers AI + Images
- Email via `inbox.psrhomes.ae` (`EMAIL_INBOX_ENABLED=true`)
- Campaign delivery off (`CAMPAIGN_DELIVERY_ENABLED=false`)

Do not rename the live D1 binding in a normal release.

Full app source is not in this repo yet. See `workers/psr-property/STATUS.md`.

Do not enable Workers Builds production auto-deploy for `psr-property` until that source is here and tests pass.

See also `docs/cloudflare-builds.md` and `docs/tenant-boundary.md`.
