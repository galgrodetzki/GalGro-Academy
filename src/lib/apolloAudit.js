import { supabase } from "./supabase";

const RUN_COLUMNS = "id,agent_key,agent_name,run_type,status,scope,summary,started_at,completed_at,created_by,created_at";
const FINDING_COLUMNS = "id,run_id,agent_key,title,severity,category,finding,recommendation,approval_required,status,metadata,created_at";

const SEVERITY_RANK = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function mapFinding(row) {
  return {
    id: row.id,
    runId: row.run_id,
    agentKey: row.agent_key,
    agentName: row.metadata?.agentName ?? row.agent_key,
    title: row.title,
    severity: row.severity,
    category: row.category,
    detail: row.finding,
    recommendation: row.recommendation,
    approvalRequired: row.approval_required,
    status: row.status,
    createdAt: row.created_at,
  };
}

function topSeverity(findings) {
  return findings.reduce((top, finding) => (
    (SEVERITY_RANK[finding.severity] ?? 0) > (SEVERITY_RANK[top] ?? 0)
      ? finding.severity
      : top
  ), "info");
}

function mapRun(row, findings) {
  const approvalCount = findings.filter((finding) => finding.approvalRequired).length;
  return {
    id: row.id,
    agentKey: row.agent_key,
    agentName: row.agent_name,
    runType: row.run_type,
    status: row.status,
    scope: row.scope,
    summary: row.summary,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    findings,
    findingCount: findings.length,
    approvalCount,
    topSeverity: topSeverity(findings),
  };
}

export async function fetchApolloAuditHistory({ limit = 8 } = {}) {
  const { data: runs, error: runsError } = await supabase
    .from("apollo_agent_runs")
    .select(RUN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (runsError) {
    throw new Error(`Could not load Apollo audit runs: ${runsError.message}`);
  }

  if (!runs?.length) return [];

  const runIds = runs.map((run) => run.id);
  const { data: findings, error: findingsError } = await supabase
    .from("apollo_findings")
    .select(FINDING_COLUMNS)
    .in("run_id", runIds)
    .order("created_at", { ascending: true });

  if (findingsError) {
    throw new Error(`Could not load Apollo findings: ${findingsError.message}`);
  }

  const findingsByRun = new Map();
  for (const finding of findings ?? []) {
    const mapped = mapFinding(finding);
    const current = findingsByRun.get(mapped.runId) ?? [];
    current.push(mapped);
    findingsByRun.set(mapped.runId, current);
  }

  return runs.map((run) => mapRun(run, findingsByRun.get(run.id) ?? []));
}
