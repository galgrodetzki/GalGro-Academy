// Mentor-C: daily generator that writes per-keeper mentor_messages.
//
// Auth paths (same pattern as Apollo runner):
//   1. x-mentor-runner-secret / Bearer <MENTOR_RUNNER_SECRET|CRON_SECRET>
//      → treated as server-to-server call; uses service-role key if present,
//      otherwise falls back to anon (and nothing will write — that's fine).
//   2. Head-coach Supabase session bearer token → manual "generate now" from
//      the Admin UI.
//
// Logic (idempotent — safe to re-run):
//   * Today (UTC) and tomorrow (UTC) windows.
//   * For every enabled template, find the matching calendar signal:
//       - training_day: sessions with session_date = today.
//       - game_day: game_days with game_date = today.
//       - game_day_eve: game_days with game_date = tomorrow.
//   * For each signal, fan out to the keepers it applies to:
//       - training_day: session.player_ids joined to profiles where role='keeper'.
//       - game_day(_eve): all active keeper profiles (opponent concerns whole keeper group).
//   * Substitute template placeholders → insert mentor_message. The UNIQUE
//     constraint on (keeper_profile_id, trigger_date, trigger_type, template_id)
//     makes re-runs no-ops.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? "https://gajcrvxyenxjqewuvkgw.supabase.co";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUNNER_SECRET = process.env.MENTOR_RUNNER_SECRET
  ?? process.env.APOLLO_RUNNER_SECRET
  ?? process.env.CRON_SECRET;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Authorization",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function makeSupabaseClient(key, accessToken) {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
  };
  if (accessToken) {
    options.global = { headers: { Authorization: `Bearer ${accessToken}` } };
  }
  return createClient(SUPABASE_URL, key, options);
}

function constantTimeEqual(a, b) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

function getRunnerSecret(request) {
  const custom = request.headers.get("x-mentor-runner-secret")
    ?? request.headers.get("x-apollo-runner-secret")
    ?? "";
  if (custom) return custom;
  return getBearerToken(request);
}

async function authorizeRequest(request) {
  const runnerSecret = getRunnerSecret(request);
  if (RUNNER_SECRET && runnerSecret && constantTimeEqual(runnerSecret, RUNNER_SECRET)) {
    return {
      ok: true,
      source: "runner_secret",
      actor: { id: null, name: "Mentor Scheduler", role: "system" },
      accessToken: "",
      writeClient: SERVICE_ROLE_KEY
        ? makeSupabaseClient(SERVICE_ROLE_KEY)
        : null,
      readClient: makeSupabaseClient(SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY),
    };
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { ok: false, status: 401, error: "Missing head-coach session." };
  }
  const supabase = makeSupabaseClient(SUPABASE_ANON_KEY, accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,role,access_expires_on")
    .eq("id", userData.user.id)
    .single();
  if (profileError || !profile) {
    return { ok: false, status: 403, error: "Could not verify portal role." };
  }
  const expired = profile.access_expires_on
    ? profile.access_expires_on < new Date().toISOString().slice(0, 10)
    : false;
  if (profile.role !== "head_coach" || expired) {
    return { ok: false, status: 403, error: "Mentor generator is head-coach only." };
  }

  return {
    ok: true,
    source: "supabase_session",
    actor: { id: userData.user.id, name: profile.name ?? "Head Coach", role: profile.role },
    accessToken,
    // Head-coach session has full access via RLS policy mentor_messages_head_coach_write.
    writeClient: supabase,
    readClient: supabase,
  };
}

function pad2(n) { return String(n).padStart(2, "0"); }
function toDateKey(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function firstName(full) {
  return String(full || "").trim().split(/\s+/)[0] || "";
}

function substitute(template, vars) {
  // Replace {{tokens}} with values; unknown tokens remain literal so coaches
  // notice and fix them.
  return String(template ?? "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = vars[key];
    return val == null || val === "" ? `{{${key}}}` : String(val);
  });
}

function humanDate(dateKey) {
  try {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateKey;
  }
}

async function loadEnabledTemplates(client) {
  const { data, error } = await client
    .from("mentor_templates")
    .select("id,trigger_type,title,body,tags,enabled")
    .eq("enabled", true);
  if (error) throw new Error(`Could not load templates: ${error.message}`);
  const byTrigger = new Map();
  (data || []).forEach((row) => {
    const list = byTrigger.get(row.trigger_type) || [];
    list.push(row);
    byTrigger.set(row.trigger_type, list);
  });
  return byTrigger;
}

async function loadKeeperProfiles(client) {
  // Keepers whose access hasn't expired. Match against profiles table;
  // players.profile_id links the roster player to the profile.
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from("profiles")
    .select("id,name,role,access_expires_on")
    .eq("role", "keeper");
  if (error) throw new Error(`Could not load keeper profiles: ${error.message}`);
  return (data || []).filter((p) => !p.access_expires_on || p.access_expires_on >= today);
}

async function loadPlayers(client) {
  const { data, error } = await client
    .from("players")
    .select("id,name,profile_id");
  if (error) throw new Error(`Could not load players: ${error.message}`);
  return data || [];
}

async function loadSessionsForDate(client, dateKey) {
  const { data, error } = await client
    .from("sessions")
    .select("id,name,target,session_date,player_ids")
    .eq("session_date", dateKey);
  if (error) throw new Error(`Could not load sessions: ${error.message}`);
  return data || [];
}

async function loadGameDaysForDate(client, dateKey) {
  const { data, error } = await client
    .from("game_days")
    .select("id,game_date,opponent,notes")
    .eq("game_date", dateKey);
  if (error) throw new Error(`Could not load game days: ${error.message}`);
  return data || [];
}

function summarizeInsertError(error) {
  // The unique constraint surfaces as code 23505. We treat that as a silent
  // skip (idempotency), not an error.
  if (error?.code === "23505") return "duplicate";
  return error?.message || "unknown";
}

async function insertMessage(client, payload) {
  const { data, error } = await client
    .from("mentor_messages")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    const kind = summarizeInsertError(error);
    return { ok: false, kind, error };
  }
  return { ok: true, id: data.id };
}

async function generateForWindow({ client, templatesByTrigger, keepers, players, today, tomorrow }) {
  const created = [];
  const skipped = [];
  const errors = [];

  const keeperById = new Map(keepers.map((k) => [k.id, k]));
  // Player → profile lookups so session.player_ids (player ids) resolve to a
  // profile a keeper can read.
  const playerToProfile = new Map(
    players
      .filter((p) => p.profile_id)
      .map((p) => [p.id, p.profile_id])
  );

  // --- training_day: session.player_ids → profile → keeper
  const trainingTemplates = templatesByTrigger.get("training_day") || [];
  if (trainingTemplates.length > 0) {
    const sessions = await loadSessionsForDate(client, today);
    for (const session of sessions) {
      const sessionKeepers = (session.player_ids || [])
        .map((pid) => playerToProfile.get(pid))
        .filter(Boolean)
        .map((profileId) => keeperById.get(profileId))
        .filter(Boolean);
      for (const keeper of sessionKeepers) {
        for (const tpl of trainingTemplates) {
          const vars = {
            keeper_name: firstName(keeper.name),
            session_name: session.name || "today's session",
            session_target: session.target || "today's focus",
            game_date: "",
            opponent: "",
          };
          const body = substitute(tpl.body, vars);
          const title = substitute(tpl.title, vars);
          const result = await insertMessage(client, {
            keeper_profile_id: keeper.id,
            trigger_date: today,
            trigger_type: "training_day",
            template_id: tpl.id,
            source_session_id: session.id,
            generated_title: title,
            generated_body: body,
            metadata: { player_ids: session.player_ids || [] },
          });
          if (result.ok) {
            created.push({ keeper: keeper.name, trigger: "training_day", template: tpl.title });
          } else if (result.kind === "duplicate") {
            skipped.push({ keeper: keeper.name, trigger: "training_day", template: tpl.title });
          } else {
            errors.push({ keeper: keeper.name, trigger: "training_day", template: tpl.title, error: result.kind });
          }
        }
      }
    }
  }

  // --- game_day: message every active keeper about today's game.
  const gameDayTemplates = templatesByTrigger.get("game_day") || [];
  if (gameDayTemplates.length > 0) {
    const games = await loadGameDaysForDate(client, today);
    for (const game of games) {
      for (const keeper of keepers) {
        for (const tpl of gameDayTemplates) {
          const vars = {
            keeper_name: firstName(keeper.name),
            opponent: game.opponent || "the opponent",
            game_date: humanDate(game.game_date),
            session_name: "",
            session_target: "",
          };
          const result = await insertMessage(client, {
            keeper_profile_id: keeper.id,
            trigger_date: today,
            trigger_type: "game_day",
            template_id: tpl.id,
            source_game_day_id: game.id,
            generated_title: substitute(tpl.title, vars),
            generated_body: substitute(tpl.body, vars),
            metadata: { opponent: game.opponent },
          });
          if (result.ok) created.push({ keeper: keeper.name, trigger: "game_day", template: tpl.title });
          else if (result.kind === "duplicate") skipped.push({ keeper: keeper.name, trigger: "game_day", template: tpl.title });
          else errors.push({ keeper: keeper.name, trigger: "game_day", template: tpl.title, error: result.kind });
        }
      }
    }
  }

  // --- game_day_eve: tomorrow's games.
  const eveTemplates = templatesByTrigger.get("game_day_eve") || [];
  if (eveTemplates.length > 0) {
    const games = await loadGameDaysForDate(client, tomorrow);
    for (const game of games) {
      for (const keeper of keepers) {
        for (const tpl of eveTemplates) {
          const vars = {
            keeper_name: firstName(keeper.name),
            opponent: game.opponent || "the opponent",
            game_date: humanDate(game.game_date),
            session_name: "",
            session_target: "",
          };
          const result = await insertMessage(client, {
            keeper_profile_id: keeper.id,
            trigger_date: today, // delivered today for tomorrow's game
            trigger_type: "game_day_eve",
            template_id: tpl.id,
            source_game_day_id: game.id,
            generated_title: substitute(tpl.title, vars),
            generated_body: substitute(tpl.body, vars),
            metadata: { opponent: game.opponent, game_date: game.game_date },
          });
          if (result.ok) created.push({ keeper: keeper.name, trigger: "game_day_eve", template: tpl.title });
          else if (result.kind === "duplicate") skipped.push({ keeper: keeper.name, trigger: "game_day_eve", template: tpl.title });
          else errors.push({ keeper: keeper.name, trigger: "game_day_eve", template: tpl.title, error: result.kind });
        }
      }
    }
  }

  return { created, skipped, errors };
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Mentor-Runner-Secret",
      },
    });
  }

  const auth = await authorizeRequest(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401);

  if (!auth.writeClient) {
    // Runner-secret call without a service-role key: we can READ but not WRITE
    // — refuse rather than silently doing nothing.
    return json({
      error: "Mentor generator cannot write: SUPABASE_SERVICE_ROLE_KEY missing. Either add it or run from the Admin UI (head-coach session).",
    }, 503);
  }

  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayKey = toDateKey(now);
    const tomorrowKey = toDateKey(tomorrow);

    const templatesByTrigger = await loadEnabledTemplates(auth.readClient);
    const [keepers, players] = await Promise.all([
      loadKeeperProfiles(auth.readClient),
      loadPlayers(auth.readClient),
    ]);

    const result = await generateForWindow({
      client: auth.writeClient,
      templatesByTrigger,
      keepers,
      players,
      today: todayKey,
      tomorrow: tomorrowKey,
    });

    return json({
      runner: "mentor",
      status: "completed",
      actor: auth.actor,
      window: { today: todayKey, tomorrow: tomorrowKey },
      templatesLoaded: Array.from(templatesByTrigger.values()).reduce((sum, arr) => sum + arr.length, 0),
      keepers: keepers.length,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
      summary: `${result.created.length} created, ${result.skipped.length} duplicates, ${result.errors.length} errors`,
    });
  } catch (err) {
    return json({ error: err?.message || "Mentor generator failed." }, 500);
  }
}
