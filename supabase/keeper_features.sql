-- Keeper-facing feature schema and policies.
-- Apply after the main rls_policies.sql baseline has been applied.

begin;

alter table public.players
add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists players_profile_id_unique
on public.players(profile_id)
where profile_id is not null;

create table if not exists public.keeper_session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, profile_id)
);

create or replace function public.can_write_keeper_note(note_player_id text, note_session_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() = 'keeper'
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
          or lower(trim(p.name)) = lower(trim(pr.name))
        )
    )
$$;

grant execute on function public.can_write_keeper_note(text, text) to authenticated;

alter table public.keeper_session_notes enable row level security;

drop policy if exists "keeper_session_notes_select_coaches_or_owner" on public.keeper_session_notes;
drop policy if exists "keeper_session_notes_insert_owner" on public.keeper_session_notes;
drop policy if exists "keeper_session_notes_update_owner" on public.keeper_session_notes;
drop policy if exists "keeper_session_notes_delete_owner" on public.keeper_session_notes;

create policy "keeper_session_notes_select_coaches_or_owner"
on public.keeper_session_notes
for select
to authenticated
using (public.can_edit_academy() or profile_id = auth.uid());

create policy "keeper_session_notes_insert_owner"
on public.keeper_session_notes
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and public.can_write_keeper_note(player_id, session_id)
);

create policy "keeper_session_notes_update_owner"
on public.keeper_session_notes
for update
to authenticated
using (profile_id = auth.uid() and public.can_write_keeper_note(player_id, session_id))
with check (profile_id = auth.uid() and public.can_write_keeper_note(player_id, session_id));

create policy "keeper_session_notes_delete_owner"
on public.keeper_session_notes
for delete
to authenticated
using (public.current_profile_role() = 'keeper' and profile_id = auth.uid());

commit;
