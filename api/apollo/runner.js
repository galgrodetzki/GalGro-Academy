import { createClient } from "@supabase/supabase-js";
import { runDepartmentAgents } from "./departmentAgents.js";

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? "https://gajcrvxyenxjqewuvkgw.supabase.co";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUNNER_SECRET = process.env.APOLLO_RUNNER_SECRET ?? process.env.CRON_SECRET;
const MODEL_ACCESS_CONFIGURED = Boolean(
  process.env.APOLLO_MODEL || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY
);
const ALLOWED_RUN_TYPES = new Set(["readiness", "department_review"]);

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
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  };

  if (accessToken) {
    options.global = {
      headers: { Authorization: `Bearer ${accessToken}` },
    };
  }

  return createClient(SUPABASE_URL, key, options);
}

function constantTimeEqual(a, b) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

function getRunnerSecret(request) {
  const customHeader = request.headers.get("x-apollo-runner-secret") ?? "";
  if (customHeader) return customHeader;

  return getBearerToken(request);
}

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function accessExpired(profile) {
  if (!profile?.access_expires_on) return false;
  return profile.access_expires_on < new Date().toISOString().slice(0, 10);
}

async function authorizeRequest(request) {
  const runnerSecret = getRunnerSecret(request);
  if (RUNNER_SECRET && runnerSecret && constantTimeEqual(runnerSecret, RUNNER_SECRET)) {
    return {
      ok: true,
      actor: {
        id: null,
        name: "Apollo Scheduler",
        role: "system",
        source: "runner_secret",
      },
      accessToken: "",
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

  if (profile.role !== "head_coach" || accessExpired(profile)) {
    return { ok: false, status: 403, error: "Apollo runner is head-coach only." };
  }

  return {
    ok: true,
    actor: {
      id: userData.user.id,
      name: profile.name ?? "Head Coach",
      role: profile.role,
      source: "supabase_session",
    },
    accessToken,
  };
}

function getRuntimeConfig(accessToken = "") {
  return {
    serviceRoleConfigured: Boolean(SERVICE_ROLE_KEY),
    manualAuditAvailable: Boolean(accessToken),
    runnerSecretConfigured: Boolean(RUNNER_SECRET),
    modelAccessConfigured: MODEL_ACCESS_CONFIGURED,
  };
}

function buildReadinessReport(actor, runType, accessToken) {
  const runtimeConfig = getRuntimeConfig(accessToken);
  const findings = [
    {
      title: "Autonomy remains locked",
      severity: "info",
      category: "control",
      detail: "Apollo can run this manual readiness check, but cannot deploy, migrate, change access, or call external tools from here.",
      recommendation: "Keep this gate until department agents have isolated scopes and explicit approval rules.",
      approvalRequired: false,
      agentKey: "apollo",
      agentName: "Apollo",
    },
    {
      title: runtimeConfig.serviceRoleConfigured || runtimeConfig.manualAuditAvailable
        ? "Audit authorization path is available"
        : "Audit writer is not configured",
      severity: runtimeConfig.serviceRoleConfigured || runtimeConfig.manualAuditAvailable ? "info" : "medium",
      category: "database",
      detail: runtimeConfig.serviceRoleConfigured
        ? "The server has a Supabase service-role key available for Apollo audit writes."
        : runtimeConfig.manualAuditAvailable
          ? "Manual Apollo runs can attempt audit writes through the verified head-coach session."
          : "Scheduled Apollo runs cannot persist until the service-role key is added in Vercel and the Apollo SQL has been applied.",
      recommendation: runtimeConfig.serviceRoleConfigured
        ? "Confirm the Apollo audit tables exist before enabling scheduled runs."
        : runtimeConfig.manualAuditAvailable
          ? "Keep scheduled runs locked until the server-only service-role path is approved."
          : "When ready, apply supabase/apollo_foundation.sql and add SUPABASE_SERVICE_ROLE_KEY as a Vercel server-only environment variable.",
      approvalRequired: !(runtimeConfig.serviceRoleConfigured || runtimeConfig.manualAuditAvailable),
      agentKey: "apollo",
      agentName: "Apollo",
    },
    {
      title: RUNNER_SECRET ? "Scheduler secret is configured" : "Scheduler secret is not configured",
      severity: RUNNER_SECRET ? "info" : "low",
      category: "runner",
      detail: RUNNER_SECRET
        ? "A server-to-server runner secret is present for future scheduled checks."
        : "Scheduled or event-triggered Apollo runs are still blocked because no runner secret is configured.",
      recommendation: RUNNER_SECRET
        ? "Use the runner secret only for read-only scheduled checks until Apollo approvals are built."
        : "Add APOLLO_RUNNER_SECRET or CRON_SECRET before wiring Vercel Cron or other server-to-server triggers.",
      approvalRequired: !RUNNER_SECRET,
      agentKey: "apollo",
      agentName: "Apollo",
    },
    {
      title: MODEL_ACCESS_CONFIGURED ? "Model access is configured" : "Model access remains locked",
      severity: "info",
      category: "model_access",
      detail: MODEL_ACCESS_CONFIGURED
        ? "A model access variable is present, but this runner does not call a model yet."
        : "Apollo has no model access from this endpoint yet.",
      recommendation: "Add model calls only after the audit tables and approval queue are working.",
      approvalRequired: true,
      agentKey: "apollo",
      agentName: "Apollo",
    },
  ];

  return {
    summary: "Apollo server-side runner readiness check completed in read-only mode.",
    actor,
    runType,
    mode: "read_only",
    gates: [
      "No autonomous production changes",
      "No external tool calls",
      "No browser-exposed service secrets",
      "No scheduled background loop",
    ],
    findings,
  };
}

async function buildDepartmentReport(actor, runType, accessToken) {
  const readClient = accessToken
    ? makeSupabaseClient(SUPABASE_ANON_KEY, accessToken)
    : SERVICE_ROLE_KEY
      ? makeSupabaseClient(SERVICE_ROLE_KEY)
      : null;
  const departmentReview = await runDepartmentAgents({
    supabase: readClient,
    config: getRuntimeConfig(accessToken),
  });

  return {
    summary: "Apollo department agents completed a read-only review.",
    actor,
    runType,
    mode: "read_only",
    gates: [
      "No autonomous production changes",
      "No external tool calls",
      "No browser-exposed service secrets",
      "Department findings only",
    ],
    agents: departmentReview.agents,
    tableChecks: departmentReview.tableChecks,
    findings: departmentReview.findings,
  };
}

async function persistAuditRun(report, actor, accessToken) {
  const auditClient = accessToken
    ? makeSupabaseClient(SUPABASE_ANON_KEY, accessToken)
    : SERVICE_ROLE_KEY
      ? makeSupabaseClient(SERVICE_ROLE_KEY)
      : null;

  if (!auditClient) {
    return {
      status: "not_configured",
      runId: null,
      message: "Audit persistence skipped; no head-coach session or service-role key is available.",
    };
  }

  const timestamp = new Date().toISOString();
  const { data: run, error: runError } = await auditClient
    .from("apollo_agent_runs")
    .insert({
      agent_key: "apollo",
      agent_name: "Apollo",
      run_type: actor.source === "runner_secret" ? "scheduled" : "manual",
      status: "completed",
      scope: "read_only",
      summary: report.summary,
      started_at: timestamp,
      completed_at: timestamp,
      created_by: actor.id,
    })
    .select("id,created_at")
    .single();

  if (runError) {
    console.error("Apollo audit run write failed", runError.message);
    return { status: "blocked", runId: null, message: "Audit tables are not ready or this actor cannot write runs yet." };
  }

  const rows = report.findings.map((finding) => ({
    run_id: run.id,
    agent_key: finding.agentKey ?? "apollo",
    title: finding.title,
    severity: finding.severity,
    category: finding.category,
    finding: finding.detail,
    recommendation: finding.recommendation,
    approval_required: finding.approvalRequired,
    metadata: {
      source: "apollo_runner",
      actorSource: actor.source,
      runType: report.runType,
      agentName: finding.agentName ?? "Apollo",
    },
  }));

  const { error: findingsError } = await auditClient.from("apollo_findings").insert(rows);
  if (findingsError) {
    console.error("Apollo finding write failed", findingsError.message);
    return { status: "partial", runId: run.id, message: "Run recorded, but findings could not be stored." };
  }

  return { status: "recorded", runId: run.id, message: "Run and findings recorded." };
}

async function handleRun(request) {
  const auth = await authorizeRequest(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const payload = request.method === "GET" ? {} : await readPayload(request);
  const runType = typeof payload.runType === "string" ? payload.runType : "readiness";
  if (!ALLOWED_RUN_TYPES.has(runType)) {
    return json({ error: "Apollo runner only accepts approved read-only checks right now." }, 400);
  }

  const report = runType === "department_review"
    ? await buildDepartmentReport(auth.actor, runType, auth.accessToken)
    : buildReadinessReport(auth.actor, runType, auth.accessToken);
  const audit = await persistAuditRun(report, auth.actor, auth.accessToken);

  return json({
    runner: "apollo",
    status: "completed",
    audit,
    report,
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return json({ error: "Method not allowed." }, 405);
    }

    try {
      return await handleRun(request);
    } catch (error) {
      console.error("Apollo runner failed", error);
      return json({ error: "Apollo runner failed safely." }, 500);
    }
  },
};
