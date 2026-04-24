import { buildApolloContextPacks } from "./contextPacks.js";
import { getBudgetStatus } from "./_tokens.js";
import {
  SERVICE_ROLE_KEY,
  authorizeHeadCoach as sharedAuthorizeHeadCoach,
} from "../_shared/auth.js";

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

function authorizeHeadCoach(request) {
  return sharedAuthorizeHeadCoach(request, { roleLabel: "Apollo status" });
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
