# PSR Supabase integration

## Current live project

The PSR Supabase data foundation currently lives inside the shared Supabase project:

- organization: `espacios.me`
- project: `entity`
- project ref: `ypkfganbwdvcjrcxygta`
- region: `ap-southeast-1`
- PostgreSQL: 17

This is a **legacy shared-platform location**, not the desired long-term tenant boundary.

## PSR tables currently present

- `psr_projects`
- `psr_units`
- `psr_knowledge_chunks`
- `psr_leads`
- `psr_conversations`
- `psr_messages`
- `psr_recommendations`
- `psr_events`
- `psr_event_registrations`

These tables currently have explicit deny-direct-access RLS policies for `anon` and `authenticated`; server-side access is expected to flow through controlled server infrastructure.

## PSR Edge Function

`psr-ai-api` is active with JWT verification enabled and additionally checks for the `service_role` claim for server-to-server use.

The audited live function source is mirrored under `supabase/functions/psr-ai-api/` so GitHub records the current PSR API implementation. Secret values are not included.

## Migration direction

Long-term options:

1. create a PSR-owned Supabase project and migrate PSR tables/function there; or
2. retain the shared database temporarily but treat PSR schemas/functions as a separately governed tenant with explicit ownership, migration history, and service credentials.

Do not copy Espacios/Aether private data or Haus & Grace/Grace data into PSR.
