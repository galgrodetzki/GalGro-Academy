# Apollo Server-side Runner

The runner is the protected server layer for Apollo. It is intentionally limited in this checkpoint.

## Current capability

- Manual readiness check from the Admin Apollo tab.
- Manual read-only department review from the Admin Apollo tab.
- Head-coach Supabase session verification.
- Optional server-to-server runner secret path for future scheduled checks.
- Future Vercel Cron compatibility through `Authorization: Bearer ${CRON_SECRET}` on `GET`.
- Optional audit persistence into `apollo_agent_runs` and `apollo_findings`: manual runs use the verified head-coach session; scheduled runs need the server-only service-role key.
- No background loop.
- No model call.
- No deployment, migration, access, or paid action.

## Department agents

- Head of Security: checks runner boundaries, service-role readiness, scheduler-secret readiness, and model-access lock state.
- Head of Cyber: checks defensive scope, runner-secret abuse resistance, and permission-escalation boundaries.
- QA Lead: checks manual runner flow, lightweight Supabase read reachability, and audit persistence readiness.

## Environment variables

- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for future scheduled Apollo audit writes. Never expose this as a `VITE_` variable.
- `APOLLO_RUNNER_SECRET`: server-to-server secret for future Vercel Cron or event-triggered runner calls.
- `CRON_SECRET`: accepted as a fallback runner secret if `APOLLO_RUNNER_SECRET` is not set. Vercel Cron sends this value as an `Authorization` bearer token.
- `APOLLO_MODEL`: future model selector. Presence alone does not make the runner call a model.
- `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`: future model access. Keep unset until model calls are explicitly approved.

## Activation order

1. Apply `supabase/apollo_foundation.sql` in Supabase.
2. Verify a manual Apollo check records a run and findings through the head-coach session.
3. Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel as a server-only environment variable before scheduled audit writes.
4. Add `APOLLO_RUNNER_SECRET` before any scheduled or server-to-server trigger.
5. Add model access only after the audit path and approval queue are working.

## Security rules

- Browser code only sends the signed-in Supabase session token for manual checks.
- Service-role access stays inside the Vercel Function.
- The runner returns safe summaries, not secrets.
- Scheduled runs remain disabled until the runner secret is configured, `vercel.json` contains a cron path, and the schedule is approved.
