-- Apollo command foundation.
-- Apply later from the Supabase SQL editor after the RLS baseline is in place.
-- This only creates the audit-ready data model. It does not start agents.

begin;

create table if not exists public.apollo_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  agent_name text not null,
  run_type text not null default 'manual'
    check (run_type in ('manual', 'scheduled', 'event', 'system')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'blocked')),
  scope text not null default 'read_only',
  summary text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.apollo_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.apollo_agent_runs(id) on delete cascade,
  agent_key text not null,
  title text not null,
  severity text not null default 'info'
    check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  category text not null default 'general',
  finding text not null,
  recommendation text not null default '',
  approval_required boolean not null default false,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'rejected', 'resolved', 'deferred')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.apollo_approvals (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid references public.apollo_findings(id) on delete cascade,
  action_key text not null,
  action_label text not null,
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired', 'completed')),
  requested_by text not null default 'apollo',
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.apollo_memory (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null unique,
  memory_type text not null default 'project'
    check (memory_type in ('project', 'preference', 'decision', 'security', 'roadmap')),
  title text not null,
  body text not null,
  sensitivity text not null default 'internal'
    check (sensitivity in ('public', 'internal', 'restricted')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists apollo_agent_runs_agent_created_idx
on public.apollo_agent_runs(agent_key, created_at desc);

create index if not exists apollo_agent_runs_status_created_idx
on public.apollo_agent_runs(status, created_at desc);

create index if not exists apollo_findings_status_severity_idx
on public.apollo_findings(status, severity, created_at desc);

create index if not exists apollo_findings_run_id_idx
on public.apollo_findings(run_id);

create index if not exists apollo_approvals_status_created_idx
on public.apollo_approvals(status, created_at desc);

create index if not exists apollo_memory_type_updated_idx
on public.apollo_memory(memory_type, updated_at desc);

alter table public.apollo_agent_runs enable row level security;
alter table public.apollo_findings enable row level security;
alter table public.apollo_approvals enable row level security;
alter table public.apollo_memory enable row level security;

drop policy if exists "apollo_agent_runs_head_coach_select" on public.apollo_agent_runs;
drop policy if exists "apollo_agent_runs_head_coach_write" on public.apollo_agent_runs;
drop policy if exists "apollo_findings_head_coach_select" on public.apollo_findings;
drop policy if exists "apollo_findings_head_coach_write" on public.apollo_findings;
drop policy if exists "apollo_approvals_head_coach_select" on public.apollo_approvals;
drop policy if exists "apollo_approvals_head_coach_write" on public.apollo_approvals;
drop policy if exists "apollo_memory_head_coach_select" on public.apollo_memory;
drop policy if exists "apollo_memory_head_coach_write" on public.apollo_memory;

create policy "apollo_agent_runs_head_coach_select"
on public.apollo_agent_runs
for select
to authenticated
using (public.is_head_coach());

create policy "apollo_agent_runs_head_coach_write"
on public.apollo_agent_runs
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

create policy "apollo_findings_head_coach_select"
on public.apollo_findings
for select
to authenticated
using (public.is_head_coach());

create policy "apollo_findings_head_coach_write"
on public.apollo_findings
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

create policy "apollo_approvals_head_coach_select"
on public.apollo_approvals
for select
to authenticated
using (public.is_head_coach());

create policy "apollo_approvals_head_coach_write"
on public.apollo_approvals
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

create policy "apollo_memory_head_coach_select"
on public.apollo_memory
for select
to authenticated
using (public.is_head_coach());

create policy "apollo_memory_head_coach_write"
on public.apollo_memory
for all
to authenticated
using (public.is_head_coach())
with check (public.is_head_coach());

commit;
