-- Mentor feed data model — Mentor A / B / C.
-- game_days: head-coach-managed team calendar entries (Mentor-A2).
-- mentor_templates: head-coach-authored templates keyed by trigger type (Mentor-B).
-- mentor_messages: generated keeper-facing feed items (Mentor-C).
-- Apply after access_expiry.sql so is_head_coach() exists.

begin;

-- Game day calendar (head-coach writes, everyone authenticated can read).
create table if not exists public.game_days (
  id uuid primary key default gen_random_uuid(),
  game_date date not null,
  opponent text not null,
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_days_date_idx
on public.game_days(game_date desc);

create or replace function public.tg_game_days_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists game_days_updated_at on public.game_days;
create trigger game_days_updated_at
before update on public.game_days
for each row execute function public.tg_game_days_updated_at();

alter table public.game_days enable row level security;

drop policy if exists "game_days_authenticated_select" on public.game_days;
drop policy if exists "game_days_head_coach_write" on public.game_days;

create policy "game_days_authenticated_select"
on public.game_days
for select
to authenticated
using (true);

create policy "game_days_head_coach_write"
on public.game_days
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());


-- Mentor templates — head-coach-authored prompts per trigger type.
create table if not exists public.mentor_templates (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null
    check (trigger_type in ('training_day', 'game_day', 'game_day_eve', 'birthday')),
  title text not null,
  body text not null,
  audience text not null default 'keeper'
    check (audience = 'keeper'),
  enabled boolean not null default true,
  tags text[] not null default '{}'::text[],
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentor_templates_trigger_idx
on public.mentor_templates(trigger_type, enabled);

create or replace function public.tg_mentor_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mentor_templates_updated_at on public.mentor_templates;
create trigger mentor_templates_updated_at
before update on public.mentor_templates
for each row execute function public.tg_mentor_templates_updated_at();

alter table public.mentor_templates enable row level security;

drop policy if exists "mentor_templates_authenticated_select" on public.mentor_templates;
drop policy if exists "mentor_templates_head_coach_write" on public.mentor_templates;

-- Any authenticated user can read the catalog; only head coach writes.
create policy "mentor_templates_authenticated_select"
on public.mentor_templates
for select
to authenticated
using (true);

create policy "mentor_templates_head_coach_write"
on public.mentor_templates
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());


-- Mentor messages — generated feed items keyed to a keeper, trigger, date, template.
create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  keeper_profile_id uuid not null references public.profiles(id) on delete cascade,
  trigger_date date not null,
  trigger_type text not null
    check (trigger_type in ('training_day', 'game_day', 'game_day_eve')),
  template_id uuid references public.mentor_templates(id) on delete set null,
  source_session_id text references public.sessions(id) on delete set null,
  source_game_day_id uuid references public.game_days(id) on delete set null,
  generated_title text not null,
  generated_body text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'dismissed')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotency key for the daily generator: one message per keeper+day+trigger+template.
create unique index if not exists mentor_messages_uniqueness
on public.mentor_messages(keeper_profile_id, trigger_date, trigger_type, template_id);

create index if not exists mentor_messages_keeper_date_idx
on public.mentor_messages(keeper_profile_id, trigger_date desc);

create index if not exists mentor_messages_unread_idx
on public.mentor_messages(keeper_profile_id, status)
where status = 'unread';

create or replace function public.tg_mentor_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mentor_messages_updated_at on public.mentor_messages;
create trigger mentor_messages_updated_at
before update on public.mentor_messages
for each row execute function public.tg_mentor_messages_updated_at();

alter table public.mentor_messages enable row level security;

drop policy if exists "mentor_messages_self_select" on public.mentor_messages;
drop policy if exists "mentor_messages_self_update" on public.mentor_messages;
drop policy if exists "mentor_messages_head_coach_write" on public.mentor_messages;
drop policy if exists "mentor_messages_head_coach_delete" on public.mentor_messages;

-- A keeper sees only their own messages; head coach sees/manages all.
create policy "mentor_messages_self_select"
on public.mentor_messages
for select
to authenticated
using (keeper_profile_id = auth.uid() or public.is_head_coach());

create policy "mentor_messages_self_update"
on public.mentor_messages
for update
to authenticated
using (keeper_profile_id = auth.uid() or public.is_head_coach())
with check (keeper_profile_id = auth.uid() or public.is_head_coach());

-- Inserts only by head-coach-scoped generator (runs authenticated as head coach).
create policy "mentor_messages_head_coach_write"
on public.mentor_messages
for insert
to authenticated
with check (public.is_head_coach());

create policy "mentor_messages_head_coach_delete"
on public.mentor_messages
for delete
to authenticated
using (public.is_head_coach());

commit;
