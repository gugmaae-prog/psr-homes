# PSR Homes Platform Audit — 24 September 2026

## Executive summary

- GitHub repository: `gugmaae-prog/psr-homes`
- Visibility: **public**
- Audited main commit: `a6d27e5fa3a8a80ccbbf29eaafc3bf85e857f1c8`
- Repository files before this audit: **9**
- GitHub Actions workflows before this audit: **none**
- Full `psr-property` application source is **not yet present**
- Companion Worker manifests exist, but corresponding source trees are incomplete/missing
- Sonu is the intended PSR AI/agent
- The current Wrangler manifest still contains legacy Grace-named Durable Object binding/class identifiers
- PSR Supabase foundation is live inside shared project `entity` and the live `psr-ai-api` source has been mirrored into this PR

## Cloudflare source gap

The current repo records manifests for:

- `psr-property`
- `psr-home-edge`
- `psr-media-edge`

However the primary app source required to produce `./dist/server/index.js` is not present, and the companion Worker source files referenced by the manifests are also not fully present.

Therefore **do not connect automatic production Cloudflare Builds yet**.

## Cloudflare audit limitation

The Cloudflare connector returned `FORBIDDEN` before live account API requests could execute. The current Worker/resource list is therefore based on checked-in manifests and prior repository documentation, not a fresh Cloudflare API inventory.

Before production automation, verify live:

- Workers and versions
- routes and route precedence
- custom domains
- service bindings
- D1/R2 bindings
- Durable Objects and migrations
- cron triggers
- email bindings
- observability
- Builds connections
- DNS
- secret names

## Grace → Sonu mismatch

`wrangler.jsonc` currently declares:

- binding: `GRACE_PUBLIC_AGENT`
- class: `GracePublicAgent`
- migration tag: `psr-public-agent-v1`

This conflicts with the confirmed tenant architecture: **Grace is Haus & Grace only; Sonu is PSR only**.

Do not perform a blind text rename. Durable Object class renames require a migration-compatible release and the actual class implementation is not yet in this repo. Treat this as a production release blocker and resolve it during the full source reconciliation.

## Supabase PSR foundation

Shared project:

- organization `espacios.me` (Pro)
- project `entity` (`ypkfganbwdvcjrcxygta`)
- region Singapore
- Postgres 17.6

PSR tables:

- `psr_projects`
- `psr_units`
- `psr_knowledge_chunks`
- `psr_leads`
- `psr_conversations`
- `psr_messages`
- `psr_recommendations`
- `psr_events`
- `psr_event_registrations`

The PSR table policies are materially stronger than several older shared-platform tables: direct `anon`/`authenticated` access is explicitly denied.

## PSR Edge Function

`psr-ai-api`:

- active
- version 1
- JWT verification enabled
- additionally checks `claims.role === "service_role"`
- supports project search/snapshot, knowledge matching, lead creation, conversations/messages, and event registration

The audited source has been copied into this repository under `supabase/functions/psr-ai-api/`.

## Shared Supabase risk inherited by PSR

The overall shared Supabase project has security/performance debt outside the PSR tables, including:

- unrestricted anonymous/public policies on several Aether/Gmail/contact/SMTP tables
- two SECURITY DEFINER functions callable by anon/authenticated
- two unauthenticated Edge Functions using service-role access
- mutable function search paths
- 12 unindexed foreign keys
- 31 RLS init-plan warnings
- 100 multiple-permissive-policy findings
- a repeated `whatsapp_messages` 404 caller

Because the project is shared, these issues create platform-level blast radius even if the PSR tables themselves deny direct access.

## Required PSR remediation order

1. complete the `psr-property` and companion Worker source backfill into GitHub;
2. re-audit Cloudflare and record exact live routes/bindings/versions;
3. implement a safe Grace-to-Sonu Durable Object migration;
4. add a deployable staging Worker/domain;
5. decide whether PSR moves to a dedicated Supabase project;
6. maintain `psr-ai-api` source and migrations in Git;
7. add CI/build gates once the application source is complete;
8. enable GitHub → Cloudflare production deployment only after parity is proven.
