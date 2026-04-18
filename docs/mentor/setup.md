# Mentor agent — setup notes

Mentor writes encouraging notes to keepers based on the team calendar
(training days, game days, night-before-game). It ships in four phases:

- **A** — calendar data + UI (`game_days`, `/calendar`, Today panel).
- **B** — template authoring (`mentor_templates`, Admin → Mentor tab).
- **C** — daily generator + keeper feed (`mentor_messages`, `/api/mentor/generate`, `MentorFeed`).
- **D** — Web Push opt-in (`push_subscriptions`, `/api/mentor/push-config`).

## Required server env vars

Set these in Vercel (Production + Preview). **Never VITE_.**

| Key | Purpose |
|-----|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Lets the scheduled generator write mentor_messages. Without it, only the Admin "Generate now" button works (head-coach session). |
| `MENTOR_RUNNER_SECRET` | Optional. Shared secret for cron → `/api/mentor/generate`. Falls back to `CRON_SECRET` if set. Vercel Cron uses the `CRON_SECRET`, so the simplest path is setting `CRON_SECRET` once and reusing it across Apollo + Mentor. |
| `VAPID_PUBLIC_KEY` | Public Web Push key. Safe to expose. |
| `VAPID_PRIVATE_KEY` | **Server-only.** Never VITE_. |
| `VAPID_SUBJECT` | `mailto:you@example.com` or your site URL. Defaults to `mailto:galgrodetzki@gmail.com`. |

Generate VAPID keys once with:

```bash
npx web-push generate-vapid-keys
```

Paste the two keys into Vercel env vars, redeploy, then the "Mentor push
notifications" toggle appears on the keeper dashboard.

## Cron schedule

`vercel.json` runs `/api/mentor/generate` daily at 06:00 UTC. The unique
constraint on `(keeper_profile_id, trigger_date, trigger_type, template_id)`
makes re-runs idempotent.

## Database objects

- `game_days` (A1) — opponent + date + notes.
- `mentor_templates` (B1) — trigger_type + title + body (supports `{{placeholders}}`) + tags + enabled.
- `mentor_messages` (C1) — per-keeper rendered messages with status / delivery tracking.
- `push_subscriptions` (D1) — one row per device, RLS-self-managed.

All tables: coach-write via `public.is_head_coach()`, read via RLS.

## Placeholders supported

- `{{keeper_name}}` — first name of the keeper
- `{{opponent}}` — game_day / game_day_eve only
- `{{game_date}}` — human-readable game date
- `{{session_name}}` — training_day only
- `{{session_target}}` — training_day only

Unknown placeholders stay literal in the rendered output (makes typos obvious).

## Debugging checklist

- **"Generate now" says 0 created, 0 duplicates** → no enabled templates match the trigger window, or no sessions/games on the dates.
- **Push toggle never shows** → either browser lacks support, or `VAPID_PUBLIC_KEY` is unset server-side (`/api/mentor/push-config` returns `configured: false`).
- **Push fails with 410 Gone** → subscription expired on the provider; generator automatically prunes it.
- **Keeper doesn't see their message** → check that `players.profile_id` links the roster entry to the `profiles.id`.
