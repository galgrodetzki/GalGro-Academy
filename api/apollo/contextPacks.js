const CONTEXT_PACK_VERSION = "13F.0";
const DEFAULT_MEMORY_SENSITIVITY = "internal";
const MEMORY_SENSITIVITY_ORDER = ["public", "internal", "restricted"];
const INCLUDE_RESTRICTED_CONTEXT = process.env.APOLLO_INCLUDE_RESTRICTED_CONTEXT === "true";
const MEMORY_SENSITIVITY_LIMIT = process.env.APOLLO_CONTEXT_SENSITIVITY ?? DEFAULT_MEMORY_SENSITIVITY;

export const APOLLO_ROADMAP = [
  "13A Command Foundation: complete.",
  "13B Server-side Runner: foundation done; manual audit records are visible.",
  "13C Department Agents: foundation done for Security, Cyber, and QA in read-only mode.",
  "13D Apollo Chat: context packs and editable memory are active; model-backed reasoning is server-gated.",
  "13E Model Access: complete. OpenAI key configured server-side; model-backed chat active via @ai-sdk/openai (gpt-5-mini). Falls back to deterministic context packs on failure.",
  "13F Background Heartbeat: manual dry-run exists; scheduled runs stay locked until scheduling, cost, scope, and server-only secrets are approved.",
];

function truncateText(value = "", maxLength = 420) {
  const text = String(value ?? "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function redactSensitiveText(value = "", maxLength = 420) {
  return truncateText(value, maxLength)
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[redacted-secret]")
    .replace(/sb_[A-Za-z0-9_-]{12,}/g, "[redacted-secret]")
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[redacted-token]");
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item) || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function tableCount(counts, tableName) {
  return counts.find((item) => item.tableName === tableName)?.count ?? 0;
}

function packStatus(errors) {
  return errors.length > 0 ? "partial" : "ready";
}

function sensitivityIndex(value) {
  const index = MEMORY_SENSITIVITY_ORDER.indexOf(value);
  return index >= 0 ? index : MEMORY_SENSITIVITY_ORDER.indexOf(DEFAULT_MEMORY_SENSITIVITY);
}

function allowedMemorySensitivities() {
  if (INCLUDE_RESTRICTED_CONTEXT) return MEMORY_SENSITIVITY_ORDER;
  return MEMORY_SENSITIVITY_ORDER.slice(0, sensitivityIndex(MEMORY_SENSITIVITY_LIMIT) + 1);
}

async function safeCount(supabase, tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  return {
    tableName,
    count: count ?? 0,
    error: error?.message ?? "",
  };
}

async function readRows(query, label) {
  const { data, error } = await query;
  return {
    rows: data ?? [],
    error: error ? `${label}: ${error.message}` : "",
  };
}

function buildGuardrailPack(actor) {
  return {
    key: "guardrails",
    title: "Apollo Guardrails",
    status: "ready",
    summary: "Apollo can observe and recommend, but cannot deploy, migrate, change access, spend money, or run background work without approval.",
    metrics: {
      autonomy: "locked",
      actorRole: actor.role,
      actorSource: actor.source,
    },
    allowed: [
      "Answer the head coach from approved context.",
      "Summarize audit history and roadmap status.",
      "Recommend next work with clear approval gates.",
      "Record chat exchanges into Apollo audit history.",
    ],
    blocked: [
      "No browser-side secrets.",
      "No production changes.",
      "No database migrations.",
      "No access or role changes.",
      "No external or destructive security testing.",
      "No scheduled heartbeat until scope, cost, and server-only secrets are approved.",
    ],
  };
}

function buildRoadmapPack() {
  return {
    key: "roadmap",
    title: "Apollo Roadmap",
    status: "ready",
    summary: "Apollo Chat and model access are active; heartbeat is dry-run only until the server runner is fully gated.",
    metrics: {
      current: "13F",
      next: "Scheduled heartbeat approval (scope, cost, secrets)",
    },
    items: APOLLO_ROADMAP,
  };
}

async function buildAuditPack(supabase) {
  const errors = [];
  const { rows: runs, error: runsError } = await readRows(
    supabase
      .from("apollo_agent_runs")
      .select("id,agent_key,agent_name,run_type,status,scope,summary,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    "apollo_agent_runs"
  );

  if (runsError) errors.push(runsError);

  const runIds = runs.map((run) => run.id);
  const { rows: findings, error: findingsError } = runIds.length > 0
    ? await readRows(
      supabase
        .from("apollo_findings")
        .select("id,run_id,agent_key,title,severity,category,finding,recommendation,approval_required,status,metadata,created_at")
        .in("run_id", runIds)
        .order("created_at", { ascending: true }),
      "apollo_findings"
    )
    : { rows: [], error: "" };

  if (findingsError) errors.push(findingsError);

  const findingsByRun = new Map();
  for (const finding of findings) {
    const current = findingsByRun.get(finding.run_id) ?? [];
    current.push({
      id: finding.id,
      agentName: finding.metadata?.agentName ?? finding.agent_key,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      finding: redactSensitiveText(finding.finding, 520),
      recommendation: redactSensitiveText(finding.recommendation, 520),
      approvalRequired: finding.approval_required,
      status: finding.status,
      createdAt: finding.created_at,
    });
    findingsByRun.set(finding.run_id, current);
  }

  const mappedRuns = runs.map((run) => ({
    id: run.id,
    agentName: run.agent_name,
    runType: run.run_type,
    status: run.status,
    scope: run.scope,
    summary: truncateText(run.summary, 220),
    createdAt: run.created_at,
    findings: findingsByRun.get(run.id) ?? [],
  }));

  const totalFindings = mappedRuns.reduce((sum, run) => sum + run.findings.length, 0);
  const approvalFindings = mappedRuns.reduce(
    (sum, run) => sum + run.findings.filter((finding) => finding.approvalRequired).length,
    0
  );

  return {
    key: "audit",
    title: "Apollo Audit History",
    status: packStatus(errors),
    summary: `${mappedRuns.length} recent runs, ${totalFindings} findings, ${approvalFindings} approval-gated.`,
    metrics: {
      runCount: mappedRuns.length,
      totalFindings,
      approvalFindings,
      openFindings: mappedRuns.reduce(
        (sum, run) => sum + run.findings.filter((finding) => finding.status === "open").length,
        0
      ),
    },
    runs: mappedRuns,
    errors,
  };
}

async function buildPortalPack(supabase) {
  const errors = [];
  const [
    counts,
    profiles,
    players,
    sessions,
    proposals,
    customDrills,
  ] = await Promise.all([
    Promise.all([
      safeCount(supabase, "profiles"),
      safeCount(supabase, "sessions"),
      safeCount(supabase, "players"),
      safeCount(supabase, "agent_proposals"),
      safeCount(supabase, "custom_drills"),
    ]),
    readRows(
      supabase
        .from("profiles")
        .select("role,access_expires_on")
        .limit(50),
      "profiles"
    ),
    readRows(
      supabase
        .from("players")
        .select("position,profile_id")
        .limit(80),
      "players"
    ),
    readRows(
      supabase
        .from("sessions")
        .select("name,status,session_date,total_duration,player_ids,blocks,created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      "sessions"
    ),
    readRows(
      supabase
        .from("agent_proposals")
        .select("name,category,duration,intensity,status,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      "agent_proposals"
    ),
    readRows(
      supabase
        .from("custom_drills")
        .select("name,category,duration,intensity,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      "custom_drills"
    ),
  ]);

  for (const count of counts) {
    if (count.error) errors.push(`${count.tableName}: ${count.error}`);
  }
  for (const result of [profiles, players, sessions, proposals, customDrills]) {
    if (result.error) errors.push(result.error);
  }

  const today = new Date().toISOString().slice(0, 10);
  const expiredProfiles = profiles.rows.filter((profile) => (
    profile.access_expires_on && profile.access_expires_on < today
  )).length;
  const linkedPlayers = players.rows.filter((player) => player.profile_id).length;

  return {
    key: "portal",
    title: "Portal Snapshot",
    status: packStatus(errors),
    summary: `${tableCount(counts, "profiles")} members, ${tableCount(counts, "players")} players, ${tableCount(counts, "sessions")} sessions, ${tableCount(counts, "agent_proposals")} drill proposals.`,
    metrics: {
      counts,
      profileRoles: countBy(profiles.rows, (profile) => profile.role),
      expiredProfiles,
      linkedPlayers,
      unlinkedPlayers: Math.max(tableCount(counts, "players") - linkedPlayers, 0),
      proposalStatuses: countBy(proposals.rows, (proposal) => proposal.status),
      playerPositions: countBy(players.rows, (player) => player.position),
    },
    recentSessions: sessions.rows.map((session) => ({
      name: truncateText(session.name, 120),
      status: session.status,
      sessionDate: session.session_date,
      duration: session.total_duration,
      playerCount: Array.isArray(session.player_ids) ? session.player_ids.length : 0,
      blockCount: Array.isArray(session.blocks) ? session.blocks.length : 0,
    })),
    recentProposals: proposals.rows.map((proposal) => ({
      name: truncateText(proposal.name, 120),
      category: proposal.category,
      status: proposal.status,
      duration: proposal.duration,
      intensity: proposal.intensity,
    })),
    recentCustomDrills: customDrills.rows.map((drill) => ({
      name: truncateText(drill.name, 120),
      category: drill.category,
      duration: drill.duration,
      intensity: drill.intensity,
    })),
    errors,
  };
}

async function buildMemoryPack(supabase) {
  const allowedSensitivities = allowedMemorySensitivities();
  const { rows, error } = await readRows(
    supabase
      .from("apollo_memory")
      .select("memory_key,memory_type,title,body,sensitivity,updated_at")
      .order("updated_at", { ascending: false })
      .limit(16),
    "apollo_memory"
  );
  const includedRows = rows.filter((memory) => allowedSensitivities.includes(memory.sensitivity));
  const excludedRestricted = rows.filter((memory) => !allowedSensitivities.includes(memory.sensitivity)).length;
  const errors = error ? [error] : [];

  return {
    key: "memory",
    title: "Apollo Memory",
    status: packStatus(errors),
    summary: `${includedRows.length} memory entries available to chat context; ${excludedRestricted} restricted entries excluded.`,
    metrics: {
      included: includedRows.length,
      excludedRestricted,
      allowedSensitivities,
      typeCounts: countBy(includedRows, (memory) => memory.memory_type),
    },
    entries: includedRows.map((memory) => ({
      key: memory.memory_key,
      type: memory.memory_type,
      title: redactSensitiveText(memory.title, 140),
      body: redactSensitiveText(memory.body, 600),
      sensitivity: memory.sensitivity,
      updatedAt: memory.updated_at,
    })),
    errors,
  };
}

async function buildApprovalPack(supabase) {
  const { rows, error } = await readRows(
    supabase
      .from("apollo_approvals")
      .select("action_key,action_label,risk_level,status,requested_by,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    "apollo_approvals"
  );
  const errors = error ? [error] : [];

  return {
    key: "approvals",
    title: "Approval Queue",
    status: packStatus(errors),
    summary: `${rows.filter((approval) => approval.status === "pending").length} pending approvals.`,
    metrics: {
      statusCounts: countBy(rows, (approval) => approval.status),
      riskCounts: countBy(rows, (approval) => approval.risk_level),
    },
    items: rows.map((approval) => ({
      actionKey: approval.action_key,
      actionLabel: redactSensitiveText(approval.action_label, 180),
      riskLevel: approval.risk_level,
      status: approval.status,
      requestedBy: approval.requested_by,
      createdAt: approval.created_at,
    })),
    errors,
  };
}

function buildPackSummary(packs) {
  return {
    ready: packs.filter((pack) => pack.status === "ready").length,
    partial: packs.filter((pack) => pack.status === "partial").length,
    packs: packs.map((pack) => ({
      key: pack.key,
      title: pack.title,
      status: pack.status,
      summary: pack.summary,
    })),
  };
}

export async function buildApolloContextPacks({ supabase, actor }) {
  const [auditPack, portalPack, memoryPack, approvalPack] = await Promise.all([
    buildAuditPack(supabase),
    buildPortalPack(supabase),
    buildMemoryPack(supabase),
    buildApprovalPack(supabase),
  ]);
  const packs = [
    buildGuardrailPack(actor),
    buildRoadmapPack(),
    auditPack,
    portalPack,
    memoryPack,
    approvalPack,
  ];

  return {
    version: CONTEXT_PACK_VERSION,
    generatedAt: new Date().toISOString(),
    actor: {
      name: actor.name,
      role: actor.role,
      source: actor.source,
    },
    packs,
    summary: buildPackSummary(packs),
    roadmap: APOLLO_ROADMAP,
    runs: auditPack.runs,
    totalFindings: auditPack.metrics.totalFindings,
    approvalFindings: auditPack.metrics.approvalFindings,
    portalCounts: portalPack.metrics.counts,
  };
}
