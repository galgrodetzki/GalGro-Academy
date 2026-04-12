-- GalGro's Academy Supabase RLS policy baseline.
-- Apply this in the Supabase SQL editor for the production project.

begin;

-- Role helpers ---------------------------------------------------------------
-- SECURITY DEFINER avoids recursive RLS lookups when policies need the current
-- user's profile role.
create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.role::text
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_head_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() = 'head_coach'
$$;

create or replace function public.can_edit_academy()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() in ('head_coach', 'assistant')
$$;

create or replace function public.is_first_account()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (select 1 from public.profiles)
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_head_coach() to authenticated;
grant execute on function public.can_edit_academy() to authenticated;
grant execute on function public.is_first_account() to anon, authenticated;

-- Enable RLS ----------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.players enable row level security;
alter table public.templates enable row level security;
alter table public.settings enable row level security;
alter table public.invites enable row level security;
alter table public.agent_proposals enable row level security;
alter table public.custom_drills enable row level security;

-- Replace any older policies on these app tables so broad legacy policies do
-- not keep granting access after this baseline is applied.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'sessions',
        'players',
        'templates',
        'settings',
        'invites',
        'agent_proposals',
        'custom_drills'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

-- Profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_head_coach" on public.profiles;
drop policy if exists "profiles_update_head_coach" on public.profiles;

create policy "profiles_select_own_or_head_coach"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_head_coach());

create policy "profiles_update_head_coach"
on public.profiles
for update
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

-- Sessions ------------------------------------------------------------------
drop policy if exists "sessions_select_authenticated" on public.sessions;
drop policy if exists "sessions_insert_editors" on public.sessions;
drop policy if exists "sessions_update_editors" on public.sessions;
drop policy if exists "sessions_delete_editors" on public.sessions;

create policy "sessions_select_authenticated"
on public.sessions
for select
to authenticated
using (true);

create policy "sessions_insert_editors"
on public.sessions
for insert
to authenticated
with check (public.can_edit_academy());

create policy "sessions_update_editors"
on public.sessions
for update
to authenticated
using (public.can_edit_academy())
with check (public.can_edit_academy());

create policy "sessions_delete_editors"
on public.sessions
for delete
to authenticated
using (public.can_edit_academy());

-- Players -------------------------------------------------------------------
drop policy if exists "players_select_authenticated" on public.players;
drop policy if exists "players_insert_editors" on public.players;
drop policy if exists "players_update_editors" on public.players;
drop policy if exists "players_delete_editors" on public.players;

create policy "players_select_authenticated"
on public.players
for select
to authenticated
using (true);

create policy "players_insert_editors"
on public.players
for insert
to authenticated
with check (public.can_edit_academy());

create policy "players_update_editors"
on public.players
for update
to authenticated
using (public.can_edit_academy())
with check (public.can_edit_academy());

create policy "players_delete_editors"
on public.players
for delete
to authenticated
using (public.can_edit_academy());

-- Templates -----------------------------------------------------------------
drop policy if exists "templates_select_editors" on public.templates;
drop policy if exists "templates_insert_editors" on public.templates;
drop policy if exists "templates_update_editors" on public.templates;
drop policy if exists "templates_delete_editors" on public.templates;

create policy "templates_select_editors"
on public.templates
for select
to authenticated
using (public.can_edit_academy());

create policy "templates_insert_editors"
on public.templates
for insert
to authenticated
with check (public.can_edit_academy());

create policy "templates_update_editors"
on public.templates
for update
to authenticated
using (public.can_edit_academy())
with check (public.can_edit_academy());

create policy "templates_delete_editors"
on public.templates
for delete
to authenticated
using (public.can_edit_academy());

-- Settings ------------------------------------------------------------------
drop policy if exists "settings_select_own" on public.settings;
drop policy if exists "settings_insert_own" on public.settings;
drop policy if exists "settings_update_own" on public.settings;
drop policy if exists "settings_delete_own" on public.settings;

create policy "settings_select_own"
on public.settings
for select
to authenticated
using (user_id = auth.uid());

create policy "settings_insert_own"
on public.settings
for insert
to authenticated
with check (user_id = auth.uid());

create policy "settings_update_own"
on public.settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "settings_delete_own"
on public.settings
for delete
to authenticated
using (user_id = auth.uid());

-- Invites -------------------------------------------------------------------
drop policy if exists "invites_validate_unused_code" on public.invites;
drop policy if exists "invites_claim_unused_after_signup" on public.invites;
drop policy if exists "invites_head_coach_manage" on public.invites;

create policy "invites_validate_unused_code"
on public.invites
for select
to anon, authenticated
using (used = false);

create policy "invites_claim_unused_after_signup"
on public.invites
for update
to authenticated
using (used = false)
with check (used = true and used_by = auth.uid());

create policy "invites_head_coach_manage"
on public.invites
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

-- Agent proposals -----------------------------------------------------------
drop policy if exists "agent_proposals_head_coach_manage" on public.agent_proposals;

create policy "agent_proposals_head_coach_manage"
on public.agent_proposals
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

-- Custom drills -------------------------------------------------------------
drop policy if exists "custom_drills_select_authenticated" on public.custom_drills;
drop policy if exists "custom_drills_insert_head_coach" on public.custom_drills;
drop policy if exists "custom_drills_update_head_coach" on public.custom_drills;
drop policy if exists "custom_drills_delete_head_coach" on public.custom_drills;

create policy "custom_drills_select_authenticated"
on public.custom_drills
for select
to authenticated
using (true);

create policy "custom_drills_insert_head_coach"
on public.custom_drills
for insert
to authenticated
with check (public.is_head_coach());

create policy "custom_drills_update_head_coach"
on public.custom_drills
for update
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

create policy "custom_drills_delete_head_coach"
on public.custom_drills
for delete
to authenticated
using (public.is_head_coach());

commit;
