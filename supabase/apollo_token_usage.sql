-- Apollo 13M-1 — daily token usage ledger.
-- Advisory counter the chat endpoint writes to after each successful model call
-- and the operations status endpoint reads from. One row per (usage_date, model).
-- Head-coach gated (the chat endpoint is already head-coach only).
-- Apply after apollo_foundation.sql + access_expiry.sql (needs is_head_coach via profiles.role).

begin;

create table if not exists public.apollo_token_usage (
  id uuid primary key default gen_random_uuid(),
  usage_date date not null default ((now() at time zone 'utc')::date),
  model text not null default 'unknown',
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  call_count integer not null default 0,
  first_recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usage_date, model)
);

create index if not exists apollo_token_usage_date_idx
on public.apollo_token_usage(usage_date desc);

alter table public.apollo_token_usage enable row level security;

drop policy if exists "apollo_token_usage_head_coach_read" on public.apollo_token_usage;
drop policy if exists "apollo_token_usage_head_coach_insert" on public.apollo_token_usage;
drop policy if exists "apollo_token_usage_head_coach_update" on public.apollo_token_usage;

-- Written from the chat endpoint while authenticated as the head coach. Split
-- across SELECT / INSERT / UPDATE so an operator can scope future delegation
-- (e.g. add a service-role write policy later) without widening the user path.
create policy "apollo_token_usage_head_coach_read"
on public.apollo_token_usage
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'head_coach'
  )
);

create policy "apollo_token_usage_head_coach_insert"
on public.apollo_token_usage
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'head_coach'
  )
);

create policy "apollo_token_usage_head_coach_update"
on public.apollo_token_usage
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'head_coach'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'head_coach'
  )
);

commit;
