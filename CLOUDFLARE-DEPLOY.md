# PSR Cloudflare deployment

> **Release gate:** do not enable automatic deployment yet. Full `psr-property` and companion Worker source parity has not been reached. The checked-in `GRACE_PUBLIC_AGENT` / `GracePublicAgent` identifiers are legacy PSR technical debt; the target PSR agent is **Sonu** and the Durable Object rename must be migrated safely, not text-replaced.

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

Full app source sync into this repo is in progress. Builds Connect for `psr-property` should wait until the application tree is present and the release gate is green.

See also `docs/cloudflare-builds.md` and `docs/tenant-boundary.md`.
