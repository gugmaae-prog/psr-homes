# Sonu Durable Object migration

Date: 24 September 2026

## Goal

Rename the existing PSR Durable Object class from `GracePublicAgent` to
`SonuPublicAgent` **without creating a new namespace or losing stored object data**.

## Source state

The Worker already implements `SonuPublicAgent`. During the migration rollout it also
re-exports:

```ts
export { SonuPublicAgent as GracePublicAgent };
```

This compatibility alias is intentionally retained for the migration deploy.

## Wrangler migration

The existing migration remains:

```json
{ "tag": "psr-public-agent-v1", "new_sqlite_classes": ["GracePublicAgent"] }
```

The new migration is:

```json
{
  "tag": "psr-public-agent-v2-sonu",
  "renamed_classes": [
    { "from": "GracePublicAgent", "to": "SonuPublicAgent" }
  ]
}
```

The live binding changes to:

```json
{ "name": "SONU_PUBLIC_AGENT", "class_name": "SonuPublicAgent" }
```

## Deployment sequence

1. Deploy this commit while the `GracePublicAgent` compatibility export is still present.
2. Verify Sonu chat/session continuity against existing Durable Object names.
3. Confirm Cloudflare reports the v2 rename migration applied successfully.
4. After rollout is fully stable, remove the old `GracePublicAgent` export alias in a later commit.
5. Do not delete the historical v1/v2 migration entries.

## Release gate

Automatic Cloudflare deployment remains disabled until an authenticated Cloudflare
account audit is available. The repository currently has no
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` Actions credentials configured.
