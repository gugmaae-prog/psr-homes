# Sonu Migration Plan

Status: **source reconciliation in progress — no production deployment authorized by this document**.

## Canonical identity

PSR Homes AI/agent identity is **Sonu**.

Active application source on the reconciliation branch uses Sonu for:

- user-facing chat/finder UI
- API route (`/api/sonu-chat`)
- session and advisor headers (`x-sonu-*`)
- component/library/service/test names
- client-brief functions
- frontend CSS/events/storage namespace

Grace belongs to Haus & Grace only.

## Temporary compatibility identifiers

These names may remain temporarily because they are tied to existing runtime/storage state rather than product identity:

- Cloudflare Durable Object binding: `GRACE_PUBLIC_AGENT`
- Cloudflare Durable Object legacy class export: `GracePublicAgent`
- historical D1 table names such as `haus_grace_leads` / `hg_*`
- historical migration filenames containing `grace`
- old asset hostname `haus-grace-assets.thekeifferjapeth.workers.dev` where still referenced by existing media records

Do not treat these as current PSR branding.

## Durable Object migration

The checked-in production manifest still uses the legacy Cloudflare Durable Object namespace. A blind rename can orphan or remap stored state incorrectly.

Cloudflare currently supports class renames through Durable Object lifecycle migrations. Before changing the production manifest:

1. restore live Cloudflare account access and verify the namespace, class, bindings, and all external Worker references;
2. keep the new `SonuPublicAgent` implementation exported with the temporary alias `GracePublicAgent`;
3. deploy a compatibility release if required so both class exports resolve;
4. apply an explicit class rename from `GracePublicAgent` to `SonuPublicAgent` using the supported Cloudflare migration mechanism;
5. change the binding name to `SONU_PUBLIC_AGENT` only after the namespace/class migration is confirmed;
6. redeploy and verify existing object state/conversations;
7. remove the old alias only after rollback and cross-Worker dependency checks pass.

## Data/table migration

Legacy table names should be migrated only when there is a schema/data migration with tests and rollback. Do not rename historical migrations.

Where a legacy table remains, new code should wrap it behind PSR/Sonu-named service functions so the legacy identifier does not leak into UI/API semantics.

## Release gate

PR #5 must pass source CI and public-repo guardrails. Cloudflare automatic production Builds remain disabled until live route/binding parity is re-audited.
