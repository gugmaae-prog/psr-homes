-- Server-only long-term memory for authenticated PSR advisors.
-- The Cloudflare Worker is the sole access layer. Browser roles receive no
-- table privileges or RLS policies.

create table if not exists public.psr_agent_memory (
  agent_email text primary key
    check (agent_email = lower(agent_email) and agent_email ~ '^[a-z0-9._%+-]+@psrhomes\.ae$'),
  display_name text not null default '',
  summary text not null default '',
  preferences jsonb not null default '{}'::jsonb,
  last_projects jsonb not null default '[]'::jsonb,
  last_conversation_id text not null default '',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.psr_agent_memory_events (
  id uuid primary key default gen_random_uuid(),
  agent_email text not null references public.psr_agent_memory(agent_email) on delete cascade,
  conversation_id text not null default '',
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (char_length(content) <= 12000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists psr_agent_memory_events_agent_recent_idx
  on public.psr_agent_memory_events (agent_email, created_at desc);

alter table public.psr_agent_memory enable row level security;
alter table public.psr_agent_memory_events enable row level security;
alter table public.psr_agent_memory force row level security;
alter table public.psr_agent_memory_events force row level security;

revoke all on table public.psr_agent_memory from anon, authenticated;
revoke all on table public.psr_agent_memory_events from anon, authenticated;
grant all on table public.psr_agent_memory to service_role;
grant all on table public.psr_agent_memory_events to service_role;

comment on table public.psr_agent_memory is
  'Private PSR advisor memory. Access is limited to the server-side service role.';
comment on table public.psr_agent_memory_events is
  'Private PSR advisor memory events. Access is limited to the server-side service role.';
