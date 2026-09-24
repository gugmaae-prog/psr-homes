# Sonu Durable Object Migration Plan

Status: **compatibility release first; class rename remains blocked until production continuity is verified**.

## Canonical identity

PSR Homes AI/agent identity is **Sonu**.

Active application source uses Sonu for:

- user-facing chat/finder UI;
- API route `/api/sonu-chat`;
- session and advisor headers;
- component/library/service/test names;
- client-brief functions;
- frontend events/storage namespace.

Grace belongs to Haus & Grace only.

## What is still legacy in production

The live Cloudflare Worker still has the existing stateful namespace attached to:

- binding: `GRACE_PUBLIC_AGENT`
- class: `GracePublicAgent`

That class name is technical state, not product branding.

The source already exports:

- `SonuPublicAgent`
- temporary alias `GracePublicAgent`

The alias exists specifically to make a no-downtime migration possible.

## Why the rename must be separate

A Durable Object class rename is a stateful Cloudflare lifecycle operation. It is not equivalent to renaming a TypeScript symbol.

The repository previously staged the explicit rename in the normal production manifest before route/service parity had been reconciled. That would combine two unrelated risk domains in one release:

1. edge routing/service topology changes;
2. stateful Durable Object class migration.

The reconciliation branch separates them.

## Phase 1 — compatibility bridge

Goal: let Sonu-named application code use the existing namespace **without renaming the class yet**.

Production-compatible binding:

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "SONU_PUBLIC_AGENT",
        "class_name": "GracePublicAgent"
      }
    ]
  },
  "migrations": [
    {
      "tag": "psr-public-agent-v1",
      "new_sqlite_classes": ["GracePublicAgent"]
    }
  ]
}
```

This keeps the already-provisioned `GracePublicAgent` class namespace in place while application code addresses it through `env.SONU_PUBLIC_AGENT`.

Do not add the rename migration in this phase.

### Verify after Phase 1

- existing visitor sessions can continue;
- signed-in advisor sessions can continue;
- old Durable Object records remain readable;
- new conversations write to the same namespace;
- no external Worker binding breaks;
- rollback to the previous Worker version remains possible.

## Phase 2 — explicit class rename

Only after Phase 1 is verified, perform the state-preserving class rename as a dedicated release.

The legacy migration form is:

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "SONU_PUBLIC_AGENT",
        "class_name": "SonuPublicAgent"
      }
    ]
  },
  "migrations": [
    {
      "tag": "psr-public-agent-v1",
      "new_sqlite_classes": ["GracePublicAgent"]
    },
    {
      "tag": "psr-public-agent-v2-sonu",
      "renamed_classes": [
        {
          "from": "GracePublicAgent",
          "to": "SonuPublicAgent"
        }
      ]
    }
  ]
}
```

Cloudflare also supports the newer declarative Durable Object `exports` lifecycle model, but migrating an existing Worker from legacy migrations to `exports` is a separate platform change. Do not combine that conversion with this class rename.

## Phase 3 — cleanup

After the class rename is confirmed in production:

1. verify existing object IDs and stored conversations through the Sonu class;
2. verify all external Worker references;
3. retain the `GracePublicAgent` code alias through the rollback window;
4. remove the alias only after rollback is no longer required;
5. regenerate Cloudflare environment types from the final PSR Wrangler config;
6. update architecture docs so Grace appears only in historical migration context.

## Historical database names

Legacy table names and migration filenames containing `grace`, `haus_grace`, or `hg_` are data-history identifiers.

Do not rename historical migrations.

Rename live tables only through explicit schema/data migrations with:

- data copy or in-place rename plan;
- compatibility code;
- tests;
- rollback;
- production verification.

Until then, wrap legacy storage names behind Sonu/PSR-named service functions so historical identifiers do not leak into UI/API semantics.

## Release gate

The class rename is blocked until all of these are true:

- live wildcard route ownership matches Git;
- `psr-media-edge` service bindings match Git;
- the compatibility bridge has been deployed and observed;
- Durable Object continuity has been verified;
- external Worker references have been checked;
- a rollback target is recorded;
- source CI and runtime probes are green.

Automatic GitHub → Cloudflare production Builds must remain disabled until after this sequence is complete.
