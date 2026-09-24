# PSR Cloudflare deployment

The PSR production application is a full-stack Worker published at
`https://psrhomes.ae`, `https://www.psrhomes.ae`, and
`https://psr.espacios.me`. Cloudflare remains the production runtime and source
of truth for operational application data.

Current declared resources:

- Worker: `psr-property`
- D1: `cba-property-db` (legacy internal name retained for the live database)
- R2: `psr-property-media`
- Durable Object: `GracePublicAgent`
- Workers AI and Images bindings
- Email sending binding for approved `@psrhomes.ae` senders
- Inbound email processing enabled through `inbox.psrhomes.ae` by
  `EMAIL_INBOX_ENABLED=true`
- Campaign delivery disabled by `CAMPAIGN_DELIVERY_ENABLED=false`

Do not rename or replace the live D1 binding as part of a normal code release.
A database rename requires a separately verified migration and rollback plan.

`public/` static assets are not in this Git repository. They are served from R2 and the live site. Cloudflare Builds auto-deploy is not enabled on this repo. The release gate in `docs/cloudflare-builds.md` still applies before any production Builds connect. See also `docs/tenant-boundary.md`.

## Verify and deploy an update

The preferred workflow releases the same clean Git commit to every configured
platform:

```bash
npm run sync:platforms
npm run sync:platforms:apply
```

For a Cloudflare-only recovery deployment:

```bash
npm ci
npm test
npx wrangler deploy --config wrangler.jsonc --dry-run
npx wrangler d1 migrations apply cba-property-db --remote --config wrangler.jsonc
npm run deploy:psr
```

This recovery path intentionally bypasses Supabase and archive synchronization;
use it only to restore service, then run the full platform pipeline afterward.

After deployment, verify the homepage, directory routes, one dynamic project
route, `/agent`, and the PSR logo. Unauthenticated `/api/agent/*` requests must
return `401`.

## Supabase boundary

Supabase is a secondary, dedicated store limited to the private
`psr_agent_memory` and `psr_agent_memory_events` tables. The Cloudflare Worker
remains their sole access layer, while D1 remains authoritative for operational
application data. Store credentials with `npm run sync:secrets:store`, then bind
`SUPABASE_URL` and `SUPABASE_SECRET_KEY` to the Worker with
`npm run sync:supabase-secrets`; never add them as plaintext Wrangler variables.

## Isolation rules

- Never paste another company's IDs, domains, secrets, databases, buckets, or
  email bindings into this project.
- Never point a migration command at an unreviewed shared database.
- Keep campaign delivery disabled until its complete live workflow is approved
  and verified. Preserve the verified Cloudflare inbox subdomain and do not
  replace the root Google Workspace MX records.
