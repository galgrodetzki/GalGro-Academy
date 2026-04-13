# Apollo Server-side Runner

The runner is the protected server layer for Apollo. It is intentionally limited in this checkpoint.

## Current capability

- Manual readiness check from the Admin Apollo tab.
- Manual read-only department review from the Admin Apollo tab.
- Head-coach Supabase session verification.
- Optional server-to-server runner secret path for future scheduled checks.
- Future Vercel Cron compatibility through `Authorization: Bearer ${CRON_SECRET}` on `GET`.
- Optional audit persistence into `apollo_agent_runs` and `apollo_findings`: manual runs use the verified head-coach session; scheduled runs need the server-only service-role key.
- Audit-history view in the Admin Apollo tab.
- Apollo Chat v1 in the Admin Apollo tab. It answers from server-built context packs for guardrails, roadmap, audit, portal snapshot, memory, and approvals. It uses the server model path only when AI Gateway auth is configured.
- Apollo Memory UI in the Admin Apollo tab. Head coaches can add, edit, and delete structured project memory that feeds approved context packs.
- Apollo Operations status in the Admin Apollo tab. It reports model access, heartbeat gating, context-pack readiness, and safe yes/no gate details without exposing secrets.
- Manual heartbeat dry-run from the Admin Apollo tab. It records read-only department findings, but it is not a scheduled background loop.
- No scheduled background loop.
- No browser-side model call.
- No deployment, migration, access, or paid action.

## Department agents

- Head of Security: checks runner boundaries, service-role readiness, scheduler-secret readiness, and model-access lock state.
- Head of Cyber: checks defensive scope, runner-secret abuse resistance, and permission-escalation boundaries.
- QA Lead: checks manual runner flow, lightweight Supabase read reachability, and audit persistence readiness.

## Environment variables

- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for future scheduled Apollo audit writes. Never expose this as a `VITE_` variable.
- `APOLLO_RUNNER_SECRET`: server-to-server secret for future Vercel Cron or event-triggered runner calls.
- `CRON_SECRET`: accepted as a fallback runner secret if `APOLLO_RUNNER_SECRET` is not set. Vercel Cron sends this value as an `Authorization` bearer token.
- `APOLLO_HEARTBEAT_ENABLED`: explicit server gate for scheduled heartbeat calls. Keep unset or `false` until the schedule, cost, scope, and audit path are approved.
- `APOLLO_MODEL`: optional Apollo Chat model selector. Defaults to `openai/gpt-5.4` when server AI Gateway auth exists.
- `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`: server-side AI Gateway auth for Apollo Chat. Keep unset until model calls are explicitly approved.
- `APOLLO_CONTEXT_SENSITIVITY`: optional memory-pack sensitivity ceiling. Defaults to `internal`.
- `APOLLO_INCLUDE_RESTRICTED_CONTEXT`: optional flag for restricted Apollo memory. Keep unset unless restricted context is deliberately approved for model prompts.

## Activation order

1. Apply `supabase/apollo_foundation.sql` in Supabase.
2. Verify a manual Apollo check records a run and findings through the head-coach session.
3. Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel as a server-only environment variable before scheduled audit writes.
4. Add `APOLLO_RUNNER_SECRET` before any scheduled or server-to-server trigger.
5. Keep Apollo context packs visible in chat and audit metadata.
6. Add or edit Apollo Memory entries from the Admin Apollo tab. Keep secrets out of memory.
7. Add model access only after the audit path and approval queue are working. Apollo Chat falls back to deterministic context-pack answers without it.
8. Use manual heartbeat dry-run to verify the department-agent reports before scheduled runs.
9. Add a real cron schedule only after `APOLLO_HEARTBEAT_ENABLED`, the runner secret, service-role audit writes, cost controls, and frequency are approved.

See `docs/apollo/model-access.md` before enabling model-backed Apollo Chat.

## Security rules

- Browser code only sends the signed-in Supabase session token for manual checks.
- Service-role access stays inside the Vercel Function.
- The runner returns safe summaries, not secrets.
- Scheduled runs remain disabled until `APOLLO_HEARTBEAT_ENABLED` is enabled, the runner secret is configured, `vercel.json` contains a cron path, and the schedule is approved.
- Apollo Memory must never store API keys, service-role keys, invite codes, session tokens, or private personal data that does not help portal operations.
