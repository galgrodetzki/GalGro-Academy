import { createClient } from "@supabase/supabase-js";
import { runDepartmentAgents } from "./departmentAgents.js";
import { executeAction, resolveTier } from "./actionExecutor.js";

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? "https://gajcrvxyenxjqewuvkgw.supabase.co";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUNNER_SECRET = process.env.APOLLO_RUNNER_SECRET ?? process.env.CRON_SECRET;
const HEARTBEAT_ENABLED = process.env.APOLLO_HEARTBEAT_ENABLED === "true";
const MODEL_AUTH_MODE = process.env.AI_GATEWAY_API_KEY
  ? "ai_gateway_key"
  : process.env.VERCEL_OIDC_TOKEN
    ? "vercel_oidc"
    : "locked";
const MODEL_ACCESS_CONFIGURED = MODEL_AUTH_MODE !== "locked";
const ALLOWED_RUN_TYPES = new Set(["readiness", "department_review", "heartbeat"]);

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
    heartbeatEnabled: HEARTBEAT_ENABLED,
    modelAccessConfigured: MODEL_ACCESS_CONFIGURED,
    modelAuthMode: MODEL_AUTH_MODE,
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
        ? `Apollo model calls can use the ${runtimeConfig.modelAuthMode} server path.`
        : "Apollo has no AI Gateway auth or Vercel OIDC token available to this endpoint yet.",
      recommendation: MODEL_ACCESS_CONFIGURED
        ? "Keep model calls server-side and audit every response."
        : "Add AI Gateway auth or Vercel OIDC before expecting model-backed Apollo chat.",
      approvalRequired: !MODEL_ACCESS_CONFIGURED,
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

async function buildHeartbeatReport(actor, runType, accessToken) {
  const runtimeConfig = getRuntimeConfig(accessToken);
  const readClient = accessToken
    ? makeSupabaseClient(SUPABASE_ANON_KEY, accessToken)
    : SERVICE_ROLE_KEY
      ? makeSupabaseClient(SERVICE_ROLE_KEY)
      : null;
  const departmentReview = await runDepartmentAgents({
    supabase: readClient,
    config: runtimeConfig,
  });

  const findings = [
    {
      title: actor.source === "runner_secret" ? "Scheduled heartbeat checkpoint completed" : "Manual heartbeat dry run completed",
      severity: "info",
      category: "heartbeat",
      detail: actor.source === "runner_secret"
        ? "Apollo ran a server-to-server read-only heartbeat checkpoint."
        : "Apollo ran a head-coach-triggered dry run. This does not enable background scheduling.",
      recommendation: "Keep heartbeat read-only until approval queue actions can be accepted or rejected in the app.",
      approvalRequired: false,
      agentKey: "apollo",
      agentName: "Apollo",
    },
    {
      title: runtimeConfig.heartbeatEnabled ? "Heartbeat schedule gate is enabled" : "Heartbeat schedule gate is locked",
      severity: runtimeConfig.heartbeatEnabled ? "info" : "low",
      category: "heartbeat_gate",
      detail: runtimeConfig.heartbeatEnabled
        ? "APOLLO_HEARTBEAT_ENABLED is set on the server."
        : "APOLLO_HEARTBEAT_ENABLED is not set, so server-to-server heartbeat requests stay blocked.",
      recommendation: runtimeConfig.heartbeatEnabled
        ? "Only add a Vercel Cron schedule after confirming runner secret, service-role key, and rate controls."
        : "Leave this locked until we are ready for scheduled background checks.",
      approvalRequired: !runtimeConfig.heartbeatEnabled,
      agentKey: "apollo",
      agentName: "Apollo",
    },
    {
      title: runtimeConfig.modelAccessConfigured ? "Model-backed chat path is ready" : "Model-backed chat path is locked",
      severity: runtimeConfig.modelAccessConfigured ? "info" : "low",
      category: "model_access",
      detail: runtimeConfig.modelAccessConfigured
        ? `Apollo can use ${runtimeConfig.modelAuthMode} for server-side model calls.`
        : "No AI Gateway auth or Vercel OIDC token is available to the server runner.",
      recommendation: runtimeConfig.modelAccessConfigured
        ? "Keep responses grounded in context packs and audit metadata."
        : "Use grounded context-pack mode until server-side model auth is configured.",
      approvalRequired: !runtimeConfig.modelAccessConfigured,
      agentKey: "apollo",
      agentName: "Apollo",
    },
    ...departmentReview.findings,
  ];

  return {
    summary: "Apollo heartbeat checkpoint completed in read-only mode.",
    actor,
    runType,
    mode: actor.source === "runner_secret" ? "scheduled_read_only" : "manual_dry_run",
    gates: [
      "No autonomous production changes",
      "No external tool calls",
      "No browser-exposed service secrets",
      "No model calls from this runner",
      "Scheduled heartbeat remains blocked unless APOLLO_HEARTBEAT_ENABLED is true",
    ],
    agents: departmentReview.agents,
    tableChecks: departmentReview.tableChecks,
    findings,
  };
}

function buildBlockedHeartbeatReport(actor, runType) {
  return {
    summary: "Apollo scheduled heartbeat blocked before execution.",
    actor,
    runType,
    mode: "blocked",
    gates: [
      "No scheduled heartbeat without APOLLO_HEARTBEAT_ENABLED",
      "No audit write attempted",
      "No department agents executed",
    ],
    findings: [
      {
        title: "Scheduled heartbeat gate is locked",
        severity: "medium",
        category: "heartbeat_gate",
        detail: "A server-to-server heartbeat request arrived, but APOLLO_HEARTBEAT_ENABLED is not true.",
        recommendation: "Keep scheduled checks disabled until Gal approves the frequency, cost boundary, and server-only secrets.",
        approvalRequired: true,
        agentKey: "apollo",
        agentName: "Apollo",
      },
    ],
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
      // Agents attach action specs via finding.action = { key, payload }.
      // The action key must be registered in actionExecutor.js — unknown
      // keys are ignored (no execution, no approval row).
      actionKey: finding.action?.key ?? null,
      actionPayload: finding.action?.payload ?? null,
    },
  }));

  const { data: insertedFindings, error: findingsError } = await auditClient
    .from("apollo_findings")
    .insert(rows)
    .select("id,title,severity,agent_key,approval_required,metadata");
  if (findingsError) {
    console.error("Apollo finding write failed", findingsError.message);
    return { status: "partial", runId: run.id, message: "Run recorded, but findings could not be stored." };
  }

  // Process actions attached to findings.
  //   observe             → execute immediately, update finding
  //   recommend / req     → create an approval row, wait for Gal
  //   forbidden / unknown → skip silently (finding itself is still recorded)
  const actionOutcomes = await processFindingActions(insertedFindings ?? [], {
    supabase: auditClient,
    actor,
  });

  return {
    status: "recorded",
    runId: run.id,
    message: "Run and findings recorded.",
    actions: actionOutcomes,
  };
}

async function processFindingActions(findings, ctx) {
  const outcomes = {
    executed: 0,
    approvalsCreated: 0,
    skipped: 0,
    errors: [],
  };

  for (const finding of findings) {
    const actionKey = finding.metadata?.actionKey;
    if (!actionKey) {
      outcomes.skipped += 1;
      continue;
    }

    const tierInfo = resolveTier(actionKey);
    if (!tierInfo.found || tierInfo.tier === "forbidden") {
      outcomes.skipped += 1;
      continue;
    }

    const payload = {
      ...(finding.metadata?.actionPayload ?? {}),
      findingId: finding.id,
    };

    if (tierInfo.tier === "observe") {
      // Auto-execute: Apollo's autonomous housekeeping lane.
      const result = await executeAction({ actionKey, payload, ctx });
      if (result.ok) {
        outcomes.executed += 1;
      } else {
        outcomes.errors.push({ findingId: finding.id, actionKey, error: result.error });
      }
      continue;
    }

    // recommend or approval_required → create an approval row.
    //
    // Dedup guard: the daily cron re-runs department review every 09:00 UTC.
    // Without this check, an unactioned Security access.revoke for profile X
    // would emit a NEW approval row every day and fill the inbox with dupes.
    // We skip if there's already a pending approval with the same action_key
    // and a payload that matches this run's target identifiers. Payload
    // matching uses JSONB containment against the ORIGINAL payload (sans
    // findingId, which differs every run) — the stored row is still a
    // superset because JSONB contains the findingId key too.
    const originalPayload = finding.metadata?.actionPayload ?? {};
    const { data: existingPending, error: dupCheckError } = await ctx.supabase
      .from("apollo_approvals")
      .select("id")
      .eq("status", "pending")
      .eq("action_key", actionKey)
      .contains("action_payload", originalPayload)
      .limit(1);

    if (dupCheckError) {
      // Fail open: if the dedup query errors, create the row anyway rather
      // than silently dropping a legit approval. A duplicate is recoverable;
      // a missing approval isn't.
      console.warn("Apollo dedup check failed, proceeding", dupCheckError.message);
    } else if (existingPending && existingPending.length > 0) {
      outcomes.skipped += 1;
      continue;
    }

    const { error: approvalError } = await ctx.supabase
      .from("apollo_approvals")
      .insert({
        finding_id: finding.id,
        action_key: actionKey,
        action_label: tierInfo.label,
        action_payload: payload,
        autonomy_tier: tierInfo.tier,
        risk_level: mapSeverityToRisk(finding.severity),
        status: "pending",
        requested_by: finding.agent_key ?? "apollo",
      });
    if (approvalError) {
      outcomes.errors.push({ findingId: finding.id, actionKey, error: approvalError.message });
    } else {
      outcomes.approvalsCreated += 1;
    }
  }

  return outcomes;
}

function mapSeverityToRisk(severity) {
  if (severity === "critical" || severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

async function handleRun(request) {
  const auth = await authorizeRequest(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const payload = request.method === "GET" ? {} : await readPayload(request);
  const urlRunType = new URL(request.url).searchParams.get("runType");
  const runType = typeof payload.runType === "string"
    ? payload.runType
    : urlRunType || (request.method === "GET" ? "heartbeat" : "readiness");
  if (!ALLOWED_RUN_TYPES.has(runType)) {
    return json({ error: "Apollo runner only accepts approved read-only checks right now." }, 400);
  }

  if (runType === "heartbeat" && auth.actor.source === "runner_secret" && !HEARTBEAT_ENABLED) {
    const report = buildBlockedHeartbeatReport(auth.actor, runType);
    return json({
      runner: "apollo",
      status: "blocked",
      audit: {
        status: "not_armed",
        runId: null,
        message: "Scheduled heartbeat is blocked until APOLLO_HEARTBEAT_ENABLED is true.",
      },
      report,
    }, 423);
  }

  const report = runType === "department_review"
    ? await buildDepartmentReport(auth.actor, runType, auth.accessToken)
    : runType === "heartbeat"
      ? await buildHeartbeatReport(auth.actor, runType, auth.accessToken)
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
