-- Access expiry support.
-- Adds optional profile expiry dates and blocks expired users at the RLS helper level.

begin;

alter table public.profiles
add column if not exists access_expires_on date;

create index if not exists profiles_access_expires_on_idx
on public.profiles(access_expires_on)
where access_expires_on is not null;

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
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'head_coach'
      and (p.access_expires_on is null or p.access_expires_on >= current_date)
  )
$$;

create or replace function public.can_edit_academy()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('head_coach', 'assistant')
      and (p.access_expires_on is null or p.access_expires_on >= current_date)
  )
$$;

create or replace function public.has_academy_access()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('head_coach', 'assistant', 'keeper', 'viewer')
      and (p.access_expires_on is null or p.access_expires_on >= current_date)
  )
$$;

create or replace function public.can_write_keeper_note(note_player_id text, note_session_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_academy_access()
    and public.current_profile_role() = 'keeper'
    and exists (
      select 1
      from public.players p
      join public.profiles pr on pr.id = auth.uid()
      join public.sessions s on s.id = note_session_id
      where p.id = note_player_id
        and p.id = any(s.player_ids)
        and s.status = 'completed'
        and (
          coalesce(array_length(s.attendance, 1), 0) = 0
          or p.id = any(s.attendance)
        )
        and (
          p.profile_id = auth.uid()
          or (
            p.profile_id is null
            and lower(trim(p.name)) = lower(trim(pr.name))
          )
        )
    )
$$;

grant execute on function public.is_head_coach() to authenticated;
grant execute on function public.can_edit_academy() to authenticated;
grant execute on function public.has_academy_access() to anon, authenticated;
grant execute on function public.can_write_keeper_note(text, text) to authenticated;
grant execute on function public.current_profile_role() to authenticated;

drop policy if exists "keeper_session_notes_delete_owner" on public.keeper_session_notes;
create policy "keeper_session_notes_delete_owner"
on public.keeper_session_notes
for delete
to authenticated
using (public.has_academy_access() and public.current_profile_role() = 'keeper' and profile_id = auth.uid());

commit;
