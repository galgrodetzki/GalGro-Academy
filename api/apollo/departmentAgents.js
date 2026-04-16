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
  {
    key: "drill_scout",
    name: "Drill Scout",
    scope: "Proposal pipeline health, drill library coverage, and approval queue.",
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

async function safeFetch(supabase, tableName, columns) {
  if (!supabase) {
    return { tableName, rows: [], error: "No read client is configured." };
  }
  const { data, error } = await supabase.from(tableName).select(columns);
  return {
    tableName,
    rows: data ?? [],
    error: error?.message ?? "",
  };
}

function runSecurityAgent(config, portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[0];
  const today = new Date().toISOString().slice(0, 10);
  const auditWriteAvailable = config.serviceRoleConfigured || config.manualAuditAvailable;
  const findings = [];

  findings.push(finding({
    agent,
    title: "Runner is still approval-gated",
    category: "control",
    detail: "Department agents are running inside Apollo's read-only runner. They cannot deploy, migrate, change access, or call external tools.",
    recommendation: "Keep this boundary until approval records and per-agent scopes are fully wired.",
  }));

  findings.push(finding({
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
  }));

  // Data check: expired but not revoked profiles
  if (portalData.profiles.rows.length > 0) {
    const expiredActive = portalData.profiles.rows.filter(
      (p) => p.access_expires_on && p.access_expires_on < today && p.role !== "revoked"
    );
    if (expiredActive.length > 0) {
      findings.push(finding({
        agent,
        title: `${expiredActive.length} profile${expiredActive.length > 1 ? "s have" : " has"} expired but ${expiredActive.length > 1 ? "are" : "is"} not revoked`,
        severity: "medium",
        category: "access",
        detail: `${expiredActive.length} profile(s) have access_expires_on in the past but role is not set to revoked. RLS blocks their DB access, but their role label is misleading.`,
        recommendation: "Review these profiles in Admin → Access and either extend their expiry or set role to revoked.",
      }));
    } else {
      findings.push(finding({
        agent,
        title: "No expired profiles with stale active roles",
        category: "access",
        detail: "All profiles with expiry dates have either valid future dates or revoked roles.",
        recommendation: "Check expiry dates periodically as training seasons change.",
      }));
    }

    // Data check: non-coach profiles with no expiry set
    const noExpiry = portalData.profiles.rows.filter(
      (p) => !p.access_expires_on && p.role !== "head_coach" && p.role !== "revoked"
    );
    if (noExpiry.length > 0) {
      findings.push(finding({
        agent,
        title: `${noExpiry.length} non-coach profile${noExpiry.length > 1 ? "s have" : " has"} no expiry date`,
        severity: "low",
        category: "access",
        detail: `${noExpiry.length} profile(s) (assistants, keepers, or viewers) have no access_expires_on set, giving indefinite portal access.`,
        recommendation: "Consider setting expiry dates for non-coach accounts in Admin → Access.",
      }));
    }
  }

  if (config.modelAccessConfigured) {
    findings.push(finding({
      agent,
      title: "Model access is configured and active",
      category: "model_access",
      detail: "OPENAI_API_KEY is configured server-side. Model-backed Apollo Chat is active via @ai-sdk/openai.",
      recommendation: "Keep model calls server-side only. Monitor usage costs periodically.",
    }));
  }

  return findings;
}

function runCyberAgent(config, portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[1];
  const findings = [];

  findings.push(finding({
    agent,
    title: "Cyber scope is defensive only",
    category: "scope",
    detail: "The Cyber agent is limited to internal posture review. No third-party targeting, credential dumping, destructive tests, or denial-of-service behavior exists in this runner.",
    recommendation: "Keep offensive test categories forbidden unless Gal approves a narrow, legal, internal test plan.",
  }));

  findings.push(finding({
    agent,
    title: "No autonomous escalation channel found",
    category: "permissions",
    detail: "Department agents can report findings, but they do not create new permissions, roles, secrets, deployments, or model calls.",
    recommendation: "Preserve this rule as more departments are added.",
  }));

  // Data check: unlinked players
  if (portalData.players.rows.length > 0) {
    const unlinked = portalData.players.rows.filter((p) => !p.profile_id);
    if (unlinked.length > 0) {
      const names = unlinked.map((p) => p.name).join(", ");
      findings.push(finding({
        agent,
        title: `${unlinked.length} player${unlinked.length > 1 ? "s are" : " is"} not linked to a keeper account`,
        severity: "low",
        category: "data_integrity",
        detail: `Player(s) without a linked profile_id: ${names}. These players cannot log in, write session reflections, or see their own training data in the Keeper Portal.`,
        recommendation: "Link keeper accounts via Admin → Players → Edit Player when those keepers are ready to use the portal.",
      }));
    } else {
      findings.push(finding({
        agent,
        title: "All players are linked to keeper accounts",
        category: "data_integrity",
        detail: "Every player in the roster has a profile_id linking them to a keeper login.",
        recommendation: "Verify links remain valid if a keeper account is revoked or a player is removed.",
      }));
    }
  }

  findings.push(finding({
    agent,
    title: config.runnerSecretConfigured ? "Cron auth is in place" : "No cron auth configured",
    severity: config.runnerSecretConfigured ? "info" : "low",
    category: "abuse_resistance",
    detail: config.runnerSecretConfigured
      ? "CRON_SECRET is configured. Vercel sends it automatically with scheduled requests."
      : "No runner secret is configured — scheduled heartbeat would be unauthenticated.",
    recommendation: config.runnerSecretConfigured
      ? "Keep cron frequency low (daily max) to limit blast radius."
      : "Add CRON_SECRET before enabling any scheduled heartbeat.",
  }));

  return findings;
}

function runQaAgent(config, portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[2];
  const today = new Date().toISOString().slice(0, 10);
  const STALE_DAYS = 7;
  const findings = [];

  const dataChecks = [portalData.profiles, portalData.players, portalData.sessions, portalData.proposals];
  const failed = dataChecks.filter((d) => d.error);
  const reached = dataChecks.filter((d) => !d.error);

  findings.push(finding({
    agent,
    title: failed.length ? "Some Supabase reads need attention" : "Supabase read path is reachable",
    severity: failed.length ? "medium" : "info",
    category: "data",
    detail: failed.length
      ? `Could not read: ${failed.map((d) => d.tableName).join(", ")}.`
      : `Read checks reached: ${reached.map((d) => d.tableName).join(", ")}.`,
    recommendation: failed.length
      ? "Check RLS policies and environment configuration before trusting scheduled QA runs."
      : "Keep these read checks as the baseline for future QA heartbeat runs.",
    approvalRequired: failed.length > 0,
  }));

  // Session gap check
  const sessionCount = portalData.sessions.count ?? 0;
  if (sessionCount === 0) {
    findings.push(finding({
      agent,
      title: "No sessions have been created yet",
      severity: "low",
      category: "portal_usage",
      detail: "The session builder and drill library are active, but zero sessions have been saved. The full coaching loop (session → attendance → reflection → Apollo analysis) cannot run until the first session is created.",
      recommendation: "Create the first session in the builder when ready. Assign players and use one of the approved custom drills.",
    }));
  } else {
    findings.push(finding({
      agent,
      title: `${sessionCount} session${sessionCount > 1 ? "s" : ""} recorded`,
      category: "portal_usage",
      detail: `${sessionCount} session(s) exist in the portal.`,
      recommendation: "Keep sessions up to date. Check keeper reflections after completed sessions.",
    }));
  }

  // Stale pending proposals
  if (portalData.proposals.rows.length > 0) {
    const stale = portalData.proposals.rows.filter((p) => {
      if (p.status !== "pending") return false;
      const daysOld = Math.floor(
        (new Date(today) - new Date(p.created_at)) / (1000 * 60 * 60 * 24)
      );
      return daysOld > STALE_DAYS;
    });
    if (stale.length > 0) {
      findings.push(finding({
        agent,
        title: `${stale.length} drill proposal${stale.length > 1 ? "s have" : " has"} been pending for over ${STALE_DAYS} days`,
        severity: "low",
        category: "portal_usage",
        detail: `Stale proposal(s) in the inbox: ${stale.map((p) => p.name).join(", ")}.`,
        recommendation: "Review pending proposals in Admin → Agent Inbox. Approve useful drills or reject to keep the pipeline clean.",
      }));
    }
  }

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
        : "Apply the Apollo SQL and add the Vercel service-role environment variable when ready to activate audit history.",
      approvalRequired: !config.manualAuditAvailable,
    }));
  }

  return findings;
}

function runDrillScoutAgent(portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[3];
  const today = new Date().toISOString().slice(0, 10);
  const findings = [];

  const proposals = portalData.proposals.rows;
  if (proposals.length === 0 && portalData.proposals.error) {
    findings.push(finding({
      agent,
      title: "Proposal data unavailable",
      severity: "low",
      category: "pipeline",
      detail: "Could not read agent_proposals table. Pipeline health cannot be assessed.",
      recommendation: "Check RLS and service-role key configuration.",
    }));
    return findings;
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const approved = proposals.filter((p) => p.status === "approved");
  const rejected = proposals.filter((p) => p.status === "rejected");

  // Pipeline overview
  findings.push(finding({
    agent,
    title: `Drill pipeline: ${proposals.length} total — ${pending.length} pending, ${approved.length} approved, ${rejected.length} rejected`,
    severity: pending.length > 3 ? "low" : "info",
    category: "pipeline",
    detail: pending.length > 0
      ? `Proposals awaiting review: ${pending.map((p) => p.name).join(", ")}.`
      : `No pending proposals. ${approved.length} approved drill${approved.length !== 1 ? "s" : ""} in the custom library.`,
    recommendation: pending.length > 0
      ? "Review pending proposals in Admin → Agent Inbox."
      : approved.length < 5
        ? "Consider generating more drill proposals to expand the custom library."
        : "Drill library is well-stocked. Focus on using drills in sessions and noting what works.",
  }));

  // Age of oldest pending proposal
  if (pending.length > 0) {
    const oldest = pending.reduce((a, b) => (a.created_at < b.created_at ? a : b));
    const daysOld = Math.floor(
      (new Date(today) - new Date(oldest.created_at)) / (1000 * 60 * 60 * 24)
    );
    if (daysOld > 3) {
      findings.push(finding({
        agent,
        title: `Oldest pending proposal is ${daysOld} day${daysOld !== 1 ? "s" : ""} old`,
        severity: daysOld > 14 ? "medium" : "low",
        category: "pipeline_age",
        detail: `"${oldest.name}" has been in the inbox for ${daysOld} days without a decision.`,
        recommendation: "A quick approve/reject keeps the pipeline healthy and helps the Drill Scout learn what you want.",
      }));
    }
  }

  // Custom library size
  findings.push(finding({
    agent,
    title: `Custom library has ${approved.length} approved drill${approved.length !== 1 ? "s" : ""}`,
    category: "library",
    detail: approved.length === 0
      ? "No custom drills approved yet. The session builder only has the static drill library."
      : `${approved.length} custom drill(s) available in the session builder alongside the static library.`,
    recommendation: approved.length < 5
      ? "Approve more proposals to build a library that reflects your coaching style."
      : "Good coverage. Review coaching points on existing drills and add session notes when you use them.",
  }));

  return findings;
}

export async function runDepartmentAgents({ supabase, config }) {
  // Fetch live portal data for all agents in parallel
  const [profiles, players, proposals] = await Promise.all([
    safeFetch(supabase, "profiles", "id, role, access_expires_on"),
    safeFetch(supabase, "players", "id, name, profile_id"),
    safeFetch(supabase, "agent_proposals", "id, name, status, created_at"),
  ]);
  const sessionsCount = await safeCount(supabase, "sessions");
  const sessions = { ...sessionsCount, rows: [] };

  const portalData = { profiles, players, sessions, proposals };

  const tableChecks = [
    { tableName: "profiles", count: profiles.rows.length, error: profiles.error },
    { tableName: "players", count: players.rows.length, error: players.error },
    { tableName: "sessions", count: sessionsCount.count, error: sessionsCount.error },
    { tableName: "agent_proposals", count: proposals.rows.length, error: proposals.error },
  ];

  const findings = [
    ...runSecurityAgent(config, portalData),
    ...runCyberAgent(config, portalData),
    ...runQaAgent(config, portalData),
    ...runDrillScoutAgent(portalData),
  ];

  return {
    agents: DEPARTMENT_AGENT_PROFILES,
    tableChecks,
    findings,
  };
}
