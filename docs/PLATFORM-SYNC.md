# PSR platform synchronization

This repository is the canonical source for `psrhomes.ae`. One immutable Git
commit is released to three distinct platform responsibilities:

- Cloudflare runs the production application and owns D1, R2, Workers AI,
  Durable Objects, email bindings, routes, and static assets.
- Supabase stores only the optional server-side PSR advisor long-term-memory
  tables created by checked-in migrations.
- Amazon S3 stores a private, versioned source archive and checksum manifest for
  disaster recovery. It is not a second writable application backend.

The verified AWS target is
`s3://psrhomes-source-613232991880-us-east-1`. It has versioning, SSE-S3
encryption, and Block Public Access enabled.

Keeping those responsibilities separate prevents D1 and Supabase from becoming
competing sources of truth.

## What synchronization means

- Application code, Worker configuration, D1 migrations, and static assets are
  released from local Git to Cloudflare.
- Only SQL files committed under `supabase/migrations/` are applied to the
  dedicated PSR Supabase project.
- Operational records are not blindly copied between D1 and Supabase. D1 stays
  authoritative for staff, CRM, inbox, documents, analytics, and catalogue
  state; Supabase stores only the server-side advisor memory contract.
- The optional AWS target receives an immutable source archive and checksum,
  not a writable copy of the application database.

This is deliberately a one-way release pipeline. Three-way source or database
replication would create conflict loops and make it unclear which copy is safe
to restore.

## Local setup

1. Create or select a dedicated Supabase project named `psrhomes`. Never use a
   shared project merely because it is already available.
2. Copy `.psr-sync.env.example` to `.psr-sync.env` and fill in only verified,
   dedicated target identifiers. `SUPABASE_PROJECT_REF`,
   `SUPABASE_PROJECT_NAME`, and `SUPABASE_URL` must describe the same project.
3. Authenticate `wrangler`, `supabase`, and the least-privilege AWS CLI profile.
4. Run `npm run sync:secrets:store`. The prompts store the Supabase database
   password and server secret key in macOS Keychain, not the repository.
5. Run `npm run sync:supabase-secrets` once to install `SUPABASE_URL` and
   `SUPABASE_SECRET_KEY` as Cloudflare Worker secrets.
6. Run `npm run sync:platforms`. This performs tests and platform dry runs
   without changing remote state.
7. Run `npm run sync:platforms:apply` only after the dry run passes.
8. Run `npm run sync:auto-install` to install the guarded post-commit hook.
9. Set `PSR_AUTO_SYNC=1` with `PSR_AUTO_SYNC_MODE=dry-run` first. Change the
   mode to `apply` only after every configured target has completed one manual
   apply successfully.

Apply mode refuses a dirty working tree. This guarantees Cloudflare, Supabase,
and S3 all receive the same committed release.

Automatic releases are queued by commit. A single runner checks out the exact
commit in a temporary detached worktree, so edits made after a commit cannot
leak into the release. If several commits are made quickly, the runner finishes
the active release and then processes the newest queued commit rather than
starting overlapping deployments. PID-backed locking also recovers a stale lock
left by a crash or forced shutdown on the next queued commit.

## Credentials

Never commit credentials. `.psr-sync.env` is ignored and intentionally contains
identifiers only. Supabase secrets live in macOS Keychain and Cloudflare Worker
secrets. The release preflight refuses to continue if the configured Supabase
reference and project name do not match or if Cloudflare lacks either required
Supabase runtime secret. AWS credentials stay in the named AWS CLI profile or
its operating-system credential provider.

The AWS identity should be restricted to `s3:ListBucket`, `s3:GetObject`, and
`s3:PutObject` for the dedicated PSR bucket and prefix. It does not need IAM,
CloudFront, Route 53, or account-wide permissions.

## Recovery

Each apply uploads both `releases/psrhomes-<commit>.tar.gz` and its JSON manifest,
then refreshes `latest/`. Verify the manifest SHA-256 before restoring an
archive. Production traffic continues to be served by Cloudflare.

The latest successful local release is recorded in `.sync/last-success.json`.
Automatic-release output is appended to `.sync/auto-sync.log`, and a failed run
writes `.sync/last-failure.json`. These files contain commit and status metadata
only and are ignored by Git.
