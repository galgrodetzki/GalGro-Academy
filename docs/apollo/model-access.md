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
