# Apollo Model Access Plan

This is the next checkpoint after Apollo Chat, context packs, memory, and manual heartbeat dry-runs.

## Goal

Enable model-backed Apollo Chat through a server-only path while keeping every response grounded in approved context packs and recorded in audit history.

## Current State

- Apollo Chat works in grounded fallback mode.
- `api/apollo/chat.js` already has a model-backed branch.
- `api/apollo/status.js` reports model readiness.
- `src/components/ApolloOperationsStatus.jsx` shows the safe model gate details in the Admin Apollo tab.
- No model key is exposed to the browser.
- No scheduled heartbeat depends on model access.

## Activation Gates

Do not activate model-backed chat until all of these are true:

1. Gal approves server-side model usage and expected cost.
2. The production Vercel environment has `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`.
3. `APOLLO_MODEL` is reviewed. The default is `openai/gpt-5.4`.
4. Apollo Operations shows model auth as something other than `locked`.
5. A head-coach chat test records an Apollo audit entry.
6. The browser bundle does not contain model credentials.

## Implementation Checklist

1. Pull latest `main`.
2. Run `npm run lint` and `npm run build` before touching model auth.
3. Confirm `api/apollo/status.js` reports `auth: locked` when no server auth is configured.
4. Configure exactly one server-side auth path in Vercel:
   - `AI_GATEWAY_API_KEY`, or
   - `VERCEL_OIDC_TOKEN`.
5. Optionally set `APOLLO_MODEL` if a different approved model is needed.
6. Redeploy through GitHub/Vercel.
7. Sign in as head coach and open Admin -> Apollo.
8. Confirm Apollo Operations shows model ready.
9. Ask Apollo a narrow question, such as `what needs attention next?`.
10. Confirm the reply is model-backed, grounded in context packs, and visible in Audit History.
11. Run live unauthenticated endpoint checks:
    - `/api/apollo/status` returns `401`.
    - `/api/apollo/chat` returns `401` without a head-coach token.
12. Keep the fallback path. If the model call fails, Apollo must answer from deterministic context packs.

## Hard Rules

- Do not add model keys to React code.
- Do not add any `VITE_` model secret.
- Do not log model auth values.
- Do not enable scheduled heartbeat during this checkpoint.
- Do not let Apollo claim live monitoring or background autonomy unless those gates are actually armed.
- Do not include restricted Apollo Memory in prompts unless `APOLLO_INCLUDE_RESTRICTED_CONTEXT` is deliberately approved.

## Expected Result

Apollo Chat moves from grounded fallback only to model-backed when server auth is present, but the operating boundary stays the same: head-coach only, context-grounded, audited, and no autonomous production actions.

## Activation Record

**Date:** 2026-04-15
**Auth path:** `AI_GATEWAY_API_KEY` (Vercel Production, Sensitive)
**Model:** `openai/gpt-5.4` (default — `APOLLO_MODEL` not overridden)
**Pre-flight:** lint passed, build passed, dist bundle clean (no auth key literals), unauth 401s confirmed on `/api/apollo/status`, `/api/apollo/chat`, `/api/apollo/runner`
**Model provider:** `@ai-sdk/openai` direct (OPENAI_API_KEY), bypassing AI Gateway
**Model:** `gpt-5-mini` (set via APOLLO_MODEL env var, prefix-stripped automatically)
**Smoke tests passed (2026-04-16):**
- lint + build clean, dist bundle contains no auth key literals
- Unauth `/api/apollo/status`, `/api/apollo/chat`, `/api/apollo/runner` → 401
- Operations panel shows `auth: openai_api_key`, `model: gpt-5-mini`
- Head-coach chat returned a real model response grounded in context packs (8 audit runs, portal counts, drill names)
- Audit run recorded at mode: model (no error level in serverless logs)
- Fallback resilience proven by earlier AI Gateway failures — all gracefully returned deterministic context-pack answers with 200 status, no 500s
**Status:** ✅ Active

---

## 13G + 13H + 13I Record — Action System Live

**Date:** 2026-04-17

Apollo moved from advisory-only to an executing command layer. Three sequential checkpoints:

### 13G — Approval Inbox plumbing
- Migration `apollo_13g_extend_approvals_for_execution` added `action_payload`, `execution_result`, `execution_error`, `executed_at`, `autonomy_tier` to `apollo_approvals`.
- `api/apollo/actionExecutor.js` introduced the central registry. Tiers: `observe` (auto-executes), `recommend` + `approval_required` (queues approval row), `forbidden` (never runs). `FORBIDDEN_CATEGORIES` hardcoded: `secret_exposure`, `destructive_test`, `third_party_attack`, `credential_dump`, `auth_bypass`.
- `api/apollo/runner.js` now reads `finding.action = { key, payload }` after findings persist, dispatches via `processFindingActions`.
- `api/apollo/approvals.js` (GET/POST) lets head coach list and decide. Approve → calls `executeAction` with the service-role client; result/error persists on the row. Reject just closes.
- `ApolloApprovalInbox` wired into the Command Center directly under Operations Status.

### 13H — Department agents got real actions
| Agent | Action key | Tier | What it does |
|---|---|---|---|
| Head of Security | `access.revoke` | approval_required | Flips `profiles.role = 'revoked'` for expired-but-active profiles. One finding per profile so each gets its own approval card. |
| QA Lead | `proposal.retire_stale` | recommend | Rejects `agent_proposals` pending > 7 days. One finding per stale proposal. Idempotent (only flips if still pending). |
| Drill Scout | `proposal.create` | observe | Replaced the old inline `agent_proposals` insert. DrillScout now emits one finding per proposed drill; the observe lane writes it. Keeps all side effects audit-visible through the action executor. |
| Head of Cyber | — | — | Still advisory-only in 13H. Scope is passive review; no safe auto-action identified yet. |

### 13I — Memory seed + docs
- Seeded `apollo_memory` via migration `apollo_13i_seed_memory` with 10 durable entries across `project`, `preference`, `decision`, `security`, `roadmap` types. Idempotent on `memory_key`. Covers: Academy identity, stack summary, Gal's collaboration style, DrillScout taste bar, head-coach-only auth, staged autonomy tiers, model path, secret boundaries, forbidden actions, shipped-checkpoints roadmap.
- Activation record above stays intact; this section appends the action-system arc.

### Hard rules still honored
- No new `VITE_` env. No browser-exposed secrets. Service-role key used only server-side for action execution.
- No background writes without either a head-coach session or cron secret.
- No action elevates its own tier; forbidden actions cannot be registered.
- Observe actions only reach safe, reversible side effects (status flips on apollo_findings, proposal queueing).
- DrillScout autonomy is bounded by proposal count + library-size ceilings (stops at 3 pending or 20 approved).

### Status: ✅ Action system live, end-to-end

## 13J Record — Approval Lifecycle Polish

Three-part cleanup so the action system feels finished: every approval now has a visible result, a retry path, and a one-click undo for destructive actions.

### 13J-1 — Retry failed executions
- `POST /api/apollo/approvals` accepts `mode: "retry"` (new `handleRetry`). Validates the source row is `status = approved` AND has `execution_error` set, re-runs through `executeAction`, flips to `completed` on success.
- `retryApprovalExecution({ approvalId })` added to `src/lib/apolloApprovals.js`.
- `DecidedApprovalRow` surfaces a Retry button on matching rows.

### 13J-2 — Surface execution_result in the UI
- New `fmtExecutionResult` helper renders the JSONB result as a human-readable one-liner under completed rows (e.g. `role: revoked · previousRole: coach`). Strips bare ID fields to avoid UUID noise.
- No API change — `execution_result` column already flowed through the GET endpoint.

### 13J-3 — Undo for destructive actions (access.revoke only)
- `access.revoke` handler now snapshots the prior role into `execution_result.previousRole` before flipping to `revoked`. Idempotent on already-revoked profiles.
- New action `access.restore` (tier: `approval_required`, category: `access_control`). Reads `{ profileId, targetRole }`, refuses `targetRole = 'revoked'`, flips back.
- `POST /api/apollo/approvals` accepts `mode: "undo"` (new `handleUndo`). Creates a pending `access.restore` approval from a completed `access.revoke` row. Does NOT auto-execute — the head coach still approves the restore through the normal flow.
- Dedup: one undo per revoke, enforced by checking `action_payload.sourceApprovalId` on existing restore rows.
- `undoAccessRevoke({ approvalId })` added to `src/lib/apolloApprovals.js`.
- `DecidedApprovalRow` shows an Undo button only when the row is a completed `access.revoke` with a restorable `previousRole`. After clicking, the inbox flips to the Pending view so the new restore approval is immediately visible.
- Scope is intentionally narrow: undo applies to `access.revoke` only. Other action types get undo if/when friction demands it.

### Hard rules still honored
- Undo never auto-executes. The restore lands as a pending approval; head coach still clicks approve.
- Retry reuses the same tier gate as the original approval — a demoted/removed action won't re-execute.
- execution_result now shapes the audit trail: every completed row says what actually changed.

### Status: ✅ Lifecycle polish shipped

## 13M-2 Record — Cron Visibility

Operations Status now shows whether the scheduled cron is actually firing.

- `api/apollo/status.js` — `fetchLastScheduledRun` queries the latest `apollo_agent_runs` row where `agent_key = 'apollo'` AND `run_type = 'scheduled'`, returns `{ lastRunAt, status, summary, runId }`. Runs in parallel with the context-pack build via `Promise.all`.
- Response shape extended: `heartbeat.lastScheduledRun` now carries the result. Fail-open: DB error surfaces as `error` but doesn't break the overall status response.
- `src/components/ApolloOperationsStatus.jsx` — new "Last cron run" section under the Heartbeat cell. Shows relative time ("3h ago" / "2d ago") + absolute timestamp + run status. Green if within 26h (normal daily cron with drift), warn otherwise. "never" when no scheduled row exists yet.
- No schema change. No new secrets. Reads via the existing head-coach session client (RLS already grants select on `apollo_agent_runs` to head_coach).

### What 13M still owes (deferred)
- **13M-1 Token/cost counter** — deferred until model-backed chat is actually in use in production. Premature to track tokens we're not spending.
- **13M-3 Weekly digest** — deferred until a week of real 13J usage confirms whether an auto-generated weekly summary is actually wanted.

### Status: ✅ Cron visibility live

## 13K Record — Cyber Joins the Action Club

Cyber had been pure advisory since 13H. It now has an observe-tier action that actively probes RLS on sensitive tables using an anonymous client — same posture as a logged-out attacker.

### `cyber.rls_audit` — observe tier, category: `housekeeping`
- Builds a fresh `@supabase/supabase-js` client with the publishable anon key and no auth header.
- Probes each target table (default: `profiles`, `players`, `sessions`, `agent_proposals`) with `.select("*", { count: "exact", head: true })`. The `head: true` option returns count only — no row data ever hits the executor.
- Three outcome paths, each updates the source finding in place (no new rows):
  - **Leaked** (`count > 0`) → finding escalated to `severity: critical`, title rewritten with table list and row counts. Left in `open` status so it shows in the Inbox.
  - **Open but empty** (`count === 0`, no error) → `severity: medium`. RLS permits anon SELECT; future rows would be public.
  - **Blocked** (DB error) → auto-resolve the finding to `status: resolved`. Keeps the audit table clean on repeat runs.
- Always returns `{ ok: true, result: { probes, status, ... } }` so the runner's observe lane logs a success outcome.

### Cyber agent finding
- New finding in `runCyberAgent`: "RLS baseline audit (anon client)". Starts at `severity: info` with `category: rls_audit`. The action handler mutates it based on what the probe returns.
- Plays nicely with the daily cron: every run creates a fresh finding. Clean runs auto-resolve, leaks escalate, open-but-empty stays at medium until fixed.

### What 13K did NOT touch
- No changes to the RLS policies themselves — Cyber only audits, never writes.
- No new approval flow. Observe tier means auto-execute; no head-coach approval needed because the action is strictly read-only on an anon client.
- No new table. Results live in the existing `apollo_findings` row via in-place update.

### Status: ✅ Cyber now active, not just advisory

## 13M-3 Record — Weekly Digest

Apollo now produces a human-readable weekly summary of portal activity and stores it as a durable `apollo_memory` entry (type: `project`, sensitivity: `internal`). This is the first phase where Apollo *produces something autonomously* rather than just reacting.

### Flow
- New runType on the runner: `weekly_digest`. Added to `ALLOWED_RUN_TYPES`.
- `buildWeeklyDigest(actor, accessToken)` — reads the previous complete week (Mon 00:00 → Sun 23:59 UTC) via `getPreviousWeekWindow()`, runs four parallel aggregation queries (approvals decided, findings recorded, sessions created, drill proposals), tallies by status/severity/action/agent, and formats a plain-text body.
- `persistWeeklyDigest(report, actor, accessToken)` — writes an `apollo_agent_runs` row (so the cron-visibility chip tracks the digest too) and inserts into `apollo_memory` with `memory_key = weekly_digest_<weekStartDay>`. Idempotent: if the key already exists, returns `already_exists` with the existing id.
- `handleRun` branches on `runType === "weekly_digest"` before the shared `persistAuditRun` path — the digest does NOT go through the findings table.

### What the body looks like
```
Week: 2026-04-06 → 2026-04-12

Approvals decided: 5
  status: completed ×3, rejected ×2
  actions: access.revoke ×2, proposal.retire_stale ×3
  execution errors: 0

Findings recorded: 14
  severity: info ×10, low ×1, medium ×2, critical ×1
  agent: head_security ×4, qa_lead ×3, drill_scout ×3, head_cyber ×4

Sessions created: 1
Drill proposals: 2
  status: pending ×1, approved ×1
```

### Triggering
- Manual (head coach): `POST /api/apollo/runner` with `{ "runType": "weekly_digest" }`. Safe to call any day — it always reports on the previous complete week. Idempotent, so repeat calls in the same week return `already_exists`.
- Scheduled: can be wired to a Vercel Cron calling the runner with `runType=weekly_digest` on Mondays. Same runner-secret auth as the daily heartbeat; no new secrets.

### Hard rules honored
- No findings emitted — digest is read-only aggregation.
- No new secrets, no new tables, no schema change.
- Idempotent per `memory_key` so the cron can fire freely without duplicates.
- Reads scoped to the previous week only — no cross-week drift.

### What 13M still owes (still deferred)
- **13M-1 Token/cost counter** — still gated on real model-backed chat usage in production.

### Status: ✅ Apollo now produces weekly output autonomously
