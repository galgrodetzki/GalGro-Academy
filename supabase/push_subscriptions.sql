-- Web Push subscription ledger — Mentor-D.
-- One row per browser/device endpoint. Owned by the profile that created it.
-- Keepers manage their own subscriptions; head coach can see/prune everyone's.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx
on public.push_subscriptions(profile_id);

create or replace function public.tg_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.tg_push_subscriptions_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_self_select" on public.push_subscriptions;
drop policy if exists "push_subscriptions_self_insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions_self_update" on public.push_subscriptions;
drop policy if exists "push_subscriptions_self_delete" on public.push_subscriptions;

-- Profile-scoped — a user only ever sees/writes their own push subscriptions.
-- Head coach can read/prune so a revoked device can be cleaned up centrally.
create policy "push_subscriptions_self_select"
on public.push_subscriptions
for select
to authenticated
using (profile_id = auth.uid() or public.is_head_coach());

create policy "push_subscriptions_self_insert"
on public.push_subscriptions
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "push_subscriptions_self_update"
on public.push_subscriptions
for update
to authenticated
using (profile_id = auth.uid() or public.is_head_coach())
with check (profile_id = auth.uid() or public.is_head_coach());

create policy "push_subscriptions_self_delete"
on public.push_subscriptions
for delete
to authenticated
using (profile_id = auth.uid() or public.is_head_coach());

commit;
