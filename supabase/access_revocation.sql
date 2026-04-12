-- Access revocation support.
-- Allows head coaches to set profiles.role = 'revoked' and blocks revoked users from app data.

begin;

do $$
declare
  role_constraint record;
begin
  for role_constraint in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', role_constraint.conname);
  end loop;
end $$;

alter table public.profiles
add constraint profiles_role_check
check (role in ('head_coach', 'assistant', 'keeper', 'viewer', 'revoked'))
not valid;

alter table public.profiles validate constraint profiles_role_check;

create or replace function public.has_academy_access()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_profile_role() in ('head_coach', 'assistant', 'keeper', 'viewer'), false)
$$;

grant execute on function public.has_academy_access() to anon, authenticated;

drop policy if exists "sessions_select_authenticated" on public.sessions;
create policy "sessions_select_authenticated"
on public.sessions
for select
to authenticated
using (public.has_academy_access());

drop policy if exists "players_select_authenticated" on public.players;
create policy "players_select_authenticated"
on public.players
for select
to authenticated
using (public.has_academy_access());

drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own"
on public.settings
for select
to authenticated
using (public.has_academy_access() and user_id = auth.uid());

drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own"
on public.settings
for insert
to authenticated
with check (public.has_academy_access() and user_id = auth.uid());

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own"
on public.settings
for update
to authenticated
using (public.has_academy_access() and user_id = auth.uid())
with check (public.has_academy_access() and user_id = auth.uid());

drop policy if exists "settings_delete_own" on public.settings;
create policy "settings_delete_own"
on public.settings
for delete
to authenticated
using (public.has_academy_access() and user_id = auth.uid());

drop policy if exists "invites_validate_unused_code" on public.invites;
create policy "invites_validate_unused_code"
on public.invites
for select
to anon, authenticated
using (used = false and (auth.role() = 'anon' or public.has_academy_access()));

drop policy if exists "custom_drills_select_authenticated" on public.custom_drills;
create policy "custom_drills_select_authenticated"
on public.custom_drills
for select
to authenticated
using (public.has_academy_access());

drop policy if exists "keeper_session_notes_select_coaches_or_owner" on public.keeper_session_notes;
create policy "keeper_session_notes_select_coaches_or_owner"
on public.keeper_session_notes
for select
to authenticated
using (public.has_academy_access() and (public.can_edit_academy() or profile_id = auth.uid()));

commit;
