# Apollo 13F — Background Heartbeat

## Goal

Wire a daily background run that lets Apollo's department agents (Security, Cyber, QA) observe the portal on a schedule, write findings to audit history, and surface anything that needs attention — without any user interaction required.

## Architecture

- `vercel.json` schedules a GET to `/api/apollo/runner` at 09:00 UTC daily.
- Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` with every cron request.
- `api/apollo/runner.js` detects the GET method and routes it as `runType=heartbeat`.
- The runner uses `SUPABASE_SERVICE_ROLE_KEY` to write audit records, bypassing RLS (no user session present in a cron context).
- `APOLLO_HEARTBEAT_ENABLED=true` is the final gate — without it the runner returns 423 and does nothing.

## Required Vercel Environment Variables (Production only, Sensitive)

| Variable | Purpose |
|----------|---------|
| `APOLLO_HEARTBEAT_ENABLED` | Must be `true` to allow scheduled runs |
| `CRON_SECRET` | Auth token Vercel sends with cron requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for audit writes without user session |

## Hard Rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `CRON_SECRET` to the browser or any `VITE_*` variable.
- The heartbeat is observe-only — it cannot deploy, migrate, change access, or make production changes.
- All findings require approval before any action is taken.
- Department agents run in read-only mode.

## Activation Record

**Date:** 2026-04-16
**Schedule:** `0 9 * * *` (09:00 UTC daily)
**Auth:** `CRON_SECRET` (Vercel Production, Sensitive)
**Service role:** `SUPABASE_SERVICE_ROLE_KEY` (Vercel Production, Sensitive)
**Gate:** `APOLLO_HEARTBEAT_ENABLED=true`
**Smoke test:** Manual POST to `/api/apollo/runner` returned 200; audit entry confirmed in Apollo Audit History.
**Status:** ✅ Active
