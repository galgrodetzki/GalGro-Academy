-- Tighten keeper reflection ownership after roster-account linking ships.
-- Apply after keeper_features.sql if that file was already run before this update.

begin;

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
          or (
            p.profile_id is null
            and lower(trim(p.name)) = lower(trim(pr.name))
          )
        )
    )
$$;

grant execute on function public.can_write_keeper_note(text, text) to authenticated;

commit;
