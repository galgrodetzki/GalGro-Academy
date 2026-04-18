import { createClient } from "@supabase/supabase-js";
import { buildApolloContextPacks } from "./contextPacks.js";
import { getBudgetStatus } from "./_tokens.js";

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? "https://gajcrvxyenxjqewuvkgw.supabase.co";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUNNER_SECRET = process.env.APOLLO_RUNNER_SECRET ?? process.env.CRON_SECRET;
const HEARTBEAT_ENABLED = process.env.APOLLO_HEARTBEAT_ENABLED === "true";
const APOLLO_MODEL = (process.env.APOLLO_MODEL ?? "gpt-5-mini").replace(/^openai\//, "");
const MODEL_AUTH_MODE = process.env.OPENAI_API_KEY
  ? "openai_api_key"
  : process.env.AI_GATEWAY_API_KEY
    ? "ai_gateway_key"
    : process.env.VERCEL_OIDC_TOKEN
      ? "vercel_oidc"
      : "locked";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Authorization",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function makeSupabaseClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

function accessExpired(profile) {
  if (!profile?.access_expires_on) return false;
  return profile.access_expires_on < new Date().toISOString().slice(0, 10);
}

async function authorizeHeadCoach(request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { ok: false, status: 401, error: "Missing head-coach session." };
  }

  const supabase = makeSupabaseClient(accessToken);
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

  if (profile.role !== "head_coach" || accessExpired(profile)) {
    return { ok: false, status: 403, error: "Apollo status is head-coach only." };
  }

  return {
    ok: true,
    supabase,
    actor: {
      id: userData.user.id,
      name: profile.name ?? "Head Coach",
      role: profile.role,
      source: "supabase_session",
    },
  };
}

// 13M-2: last-cron-run visibility. Reads the most recent apollo_agent_runs
// row tagged run_type='scheduled' so Operations Status can show when the cron
// last fired. A null lastRunAt is meaningful — it means either the cron isn't
// configured yet or it hasn't fired since the table was created.
async function fetchLastScheduledRun(supabaseClient) {
  const { data, error } = await supabaseClient
    .from("apollo_agent_runs")
    .select("id,status,summary,completed_at,created_at,run_type")
    .eq("agent_key", "apollo")
    .eq("run_type", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Fail open: surface as "unknown" rather than blowing up the whole status.
    return { lastRunAt: null, status: null, summary: null, runId: null, error: error.message };
  }
  if (!data) {
    return { lastRunAt: null, status: null, summary: null, runId: null, error: null };
  }
  return {
    lastRunAt: data.completed_at ?? data.created_at,
    status: data.status,
    summary: data.summary,
    runId: data.id,
    error: null,
  };
}

async function handleStatus(request) {
  const auth = await authorizeHeadCoach(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const [context, lastScheduled, tokens] = await Promise.all([
    buildApolloContextPacks({ supabase: auth.supabase, actor: auth.actor }),
    fetchLastScheduledRun(auth.supabase),
    getBudgetStatus(auth.supabase),
  ]);
  const modelConfigured = MODEL_AUTH_MODE !== "locked";
  const heartbeatArmed = HEARTBEAT_ENABLED && Boolean(RUNNER_SECRET) && Boolean(SERVICE_ROLE_KEY);

  return json({
    status: "completed",
    model: {
      configured: modelConfigured,
      authMode: MODEL_AUTH_MODE,
      model: APOLLO_MODEL,
      mode: modelConfigured ? "server_model_ready" : "grounded_fallback_only",
      message: modelConfigured
        ? "Apollo can use the server model path for chat responses."
        : "Apollo will keep using deterministic context-pack answers until an OpenAI key, AI Gateway key, or Vercel OIDC token is available server-side.",
      // 13M-1: today's token usage + daily budget so Operations Status can
      // show "tokens today: X / Y" and flip grounded when exhausted.
      tokens: {
        usedToday: tokens.used,
        dailyBudget: tokens.budget,
        remaining: tokens.remaining,
        exhausted: tokens.exhausted,
      },
    },
    heartbeat: {
      armed: heartbeatArmed,
      enabled: HEARTBEAT_ENABLED,
      runnerSecretConfigured: Boolean(RUNNER_SECRET),
      serviceRoleConfigured: Boolean(SERVICE_ROLE_KEY),
      mode: heartbeatArmed ? "scheduled_ready" : "manual_dry_run_only",
      message: heartbeatArmed
        ? "Scheduled heartbeat has the required server gates."
        : "Heartbeat remains manual/dry-run only until APOLLO_HEARTBEAT_ENABLED, runner secret, and service-role key are all configured.",
      // 13M-2: surface the latest scheduled run under the heartbeat payload so
      // the UI can show "last cron run: <timestamp>" without a second round trip.
      lastScheduledRun: lastScheduled,
    },
    context: {
      version: context.version,
      summary: context.summary,
      packs: context.summary.packs,
    },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed." }, 405);
    }

    try {
      return await handleStatus(request);
    } catch (error) {
      console.error("Apollo status failed", error);
      return json({ error: "Apollo status failed safely." }, 500);
    }
  },
};
