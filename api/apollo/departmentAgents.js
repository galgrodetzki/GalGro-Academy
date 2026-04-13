const DEPARTMENT_AGENT_PROFILES = [
  {
    key: "head_security",
    name: "Head of Security",
    scope: "Auth, secrets, runner boundaries, and deployment posture.",
  },
  {
    key: "head_cyber",
    name: "Head of Cyber",
    scope: "Safe internal red-team review inside the approved app perimeter.",
  },
  {
    key: "qa_lead",
    name: "QA Lead",
    scope: "Critical flow readiness, data reachability, and release confidence.",
  },
];

function finding({ agent, title, severity = "info", category, detail, recommendation, approvalRequired = false }) {
  return {
    agentKey: agent.key,
    agentName: agent.name,
    title,
    severity,
    category,
    detail,
    recommendation,
    approvalRequired,
  };
}

async function safeCount(supabase, tableName) {
  if (!supabase) {
    return { tableName, count: null, error: "No read client is configured." };
  }

  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  return {
    tableName,
    count: count ?? null,
    error: error?.message ?? "",
  };
}

function runSecurityAgent(config) {
  const agent = DEPARTMENT_AGENT_PROFILES[0];
  const auditWriteAvailable = config.serviceRoleConfigured || config.manualAuditAvailable;
  const findings = [
    finding({
      agent,
      title: "Runner is still approval-gated",
      category: "control",
      detail: "Department agents are running inside Apollo's read-only runner. They cannot deploy, migrate, change access, or call external tools.",
      recommendation: "Keep this boundary until approval records and per-agent scopes are fully wired.",
    }),
    finding({
      agent,
      title: auditWriteAvailable ? "Audit authorization path is available" : "Audit write path is not configured",
      severity: auditWriteAvailable ? "info" : "medium",
      category: "secrets",
      detail: config.serviceRoleConfigured
        ? "SUPABASE_SERVICE_ROLE_KEY is available only to the server runner."
        : config.manualAuditAvailable
          ? "Manual Apollo runs can use the current head-coach session to attempt audit writes through RLS."
          : "Apollo cannot persist scheduled department runs until the Supabase service-role key is added in Vercel.",
      recommendation: config.serviceRoleConfigured
        ? "Use the service-role key only for narrow Apollo audit writes."
        : config.manualAuditAvailable
          ? "Keep manual audit writes behind the head-coach session until scheduled runs are approved."
          : "Add SUPABASE_SERVICE_ROLE_KEY only after supabase/apollo_foundation.sql has been applied.",
      approvalRequired: !auditWriteAvailable,
    }),
    finding({
      agent,
      title: config.runnerSecretConfigured ? "Scheduler secret is present" : "Scheduler secret is not configured",
      severity: config.runnerSecretConfigured ? "info" : "low",
      category: "runner",
      detail: config.runnerSecretConfigured
        ? "A server-to-server runner secret is present for future scheduled checks."
        : "Background department runs are still blocked because no runner secret is configured.",
      recommendation: config.runnerSecretConfigured
        ? "Do not add a cron schedule until the approval queue is visible in Admin."
        : "Add APOLLO_RUNNER_SECRET or CRON_SECRET only when we are ready to approve scheduled checks.",
      approvalRequired: !config.runnerSecretConfigured,
    }),
  ];

  if (config.modelAccessConfigured) {
    findings.push(finding({
      agent,
      title: "Model access is present but locked",
      severity: "medium",
      category: "model_access",
      detail: "A model access environment variable exists, but department agents still run deterministically in this checkpoint.",
      recommendation: "Do not enable model calls until Apollo approval records can capture request purpose, cost, and output.",
      approvalRequired: true,
    }));
  }

  return findings;
}

function runCyberAgent(config) {
  const agent = DEPARTMENT_AGENT_PROFILES[1];
  return [
    finding({
      agent,
      title: "Cyber scope is defensive only",
      category: "scope",
      detail: "The Cyber agent is limited to internal posture review. No third-party targeting, credential dumping, destructive tests, or denial-of-service behavior exists in this runner.",
      recommendation: "Keep offensive test categories forbidden unless Gal approves a narrow, legal, internal test plan.",
    }),
    finding({
      agent,
      title: "Runner secret path needs rate controls before scheduling",
      severity: config.runnerSecretConfigured ? "medium" : "low",
      category: "abuse_resistance",
      detail: config.runnerSecretConfigured
        ? "The secret path is available for future scheduler calls, but no explicit app-level rate limiter is attached yet."
        : "The secret path is inactive because no runner secret is configured.",
      recommendation: "Before adding cron or public webhook triggers, pair the secret with low-frequency scheduling and Vercel-side firewall or rate controls.",
      approvalRequired: config.runnerSecretConfigured,
    }),
    finding({
      agent,
      title: "No autonomous escalation channel found",
      category: "permissions",
      detail: "Department agents can report findings, but they do not create new permissions, roles, secrets, deployments, or model calls.",
      recommendation: "Preserve this rule as more departments are added.",
    }),
  ];
}

function runQaAgent(config, tableChecks) {
  const agent = DEPARTMENT_AGENT_PROFILES[2];
  const failedTables = tableChecks.filter((check) => check.error);
  const reachableTables = tableChecks.filter((check) => !check.error);
  const findings = [
    finding({
      agent,
      title: "Manual department review completed",
      category: "flow",
      detail: "The Admin Apollo tab can trigger a department review through the server runner and receive structured findings.",
      recommendation: "Use this path for manual QA before enabling any scheduled heartbeat.",
    }),
    finding({
      agent,
      title: failedTables.length ? "Some Supabase reads need attention" : "Supabase read path is reachable",
      severity: failedTables.length ? "medium" : "info",
      category: "data",
      detail: failedTables.length
        ? `Could not read: ${failedTables.map((check) => check.tableName).join(", ")}.`
        : `Read checks reached ${reachableTables.map((check) => check.tableName).join(", ")}.`,
      recommendation: failedTables.length
        ? "Check RLS policies and environment configuration before trusting scheduled QA runs."
        : "Keep these lightweight read checks as the baseline for future QA heartbeat runs.",
      approvalRequired: failedTables.length > 0,
    }),
  ];

  if (!config.serviceRoleConfigured) {
    findings.push(finding({
      agent,
      title: config.manualAuditAvailable ? "Scheduled audit verification is blocked" : "Audit verification is blocked",
      severity: config.manualAuditAvailable ? "low" : "medium",
      category: "audit",
      detail: config.manualAuditAvailable
        ? "Manual reviews can be recorded through the head-coach session, but scheduled reviews still need a server-only service-role key."
        : "The QA agent cannot confirm persistent department-agent history until an audit write path is configured.",
      recommendation: config.manualAuditAvailable
        ? "Keep scheduled heartbeat locked until the service-role key and runner secret are approved."
        : "Apply the Apollo SQL and add the Vercel service-role environment variable when we are ready to activate audit history.",
      approvalRequired: !config.manualAuditAvailable,
    }));
  }

  return findings;
}

export async function runDepartmentAgents({ supabase, config }) {
  const tableChecks = await Promise.all([
    safeCount(supabase, "profiles"),
    safeCount(supabase, "sessions"),
    safeCount(supabase, "players"),
    safeCount(supabase, "agent_proposals"),
  ]);

  const findings = [
    ...runSecurityAgent(config),
    ...runCyberAgent(config),
    ...runQaAgent(config, tableChecks),
  ];

  return {
    agents: DEPARTMENT_AGENT_PROFILES,
    tableChecks,
    findings,
  };
}
