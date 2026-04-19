import { useCallback, useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Bot, CheckCircle2, Clock, Key, RefreshCw, Shield,
  Sparkles, Users, Zap, AlertTriangle, Activity,
} from "lucide-react";
import {
  APOLLO_APPROVAL_TIERS,
  APOLLO_DEPARTMENTS,
  APOLLO_FOUNDATION_STEPS,
  APOLLO_PRINCIPLES,
} from "../data/apollo";
import ApolloApprovalInbox from "./ApolloApprovalInbox";
import ApolloChat from "./ApolloChat";
import ApolloMemory from "./ApolloMemory";
import ApolloOperationsStatus from "./ApolloOperationsStatus";
import EmptyState from "./ui/EmptyState";
import StatChip from "./ui/StatChip";
import StatusDot from "./ui/StatusDot";
import DepartmentSparkline from "./ui/DepartmentSparkline";
import { SkeletonList } from "./ui/Skeleton";
import CommandTopology from "./ui/CommandTopology";
import { fetchApolloAuditHistory, fetchApolloSparklineData } from "../lib/apolloAudit";
import {
  runApolloDepartmentReview,
  runApolloHeartbeatDryRun,
  runApolloReadinessCheck,
} from "../lib/apolloRunner";
import { useData } from "../context/DataContext";

// ── Style maps ──────────────────────────────────────────────────────────────

const foundationStatusStyle = {
  Complete:     "chip chip-success",
  Active:       "chip chip-success",
  Existing:     "chip chip-success",
  Foundation:   "chip chip-info",
  "In progress":"chip chip-info",
  Next:         "chip chip-info",
  Planned:      "chip chip-neutral",
  Queued:       "chip chip-neutral",
};

const severityStyle = {
  info:     "chip chip-info",
  low:      "chip chip-success",
  medium:   "chip chip-warning",
  high:     "bg-orange/10 text-orange border-orange/30 chip",
  critical: "chip chip-danger",
};

const runStatusStyle = {
  completed: "chip chip-success",
  failed:    "chip chip-danger",
  blocked:   "chip chip-warning",
  running:   "chip chip-info",
  queued:    "chip chip-neutral",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const auditFmt = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});
function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : auditFmt.format(d);
}
function fmtRunType(v = "") { return String(v).replace(/_/g, " "); }

// Severity left-edge bar color
const severityBar = {
  info:     "bg-info",
  low:      "bg-success",
  medium:   "bg-warning",
  high:     "bg-orange",
  critical: "bg-danger",
};

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({ status, className = "" }) {
  return (
    <span className={`${foundationStatusStyle[status] ?? foundationStatusStyle.Planned} ${className}`}>
      {status}
    </span>
  );
}

function FindingRow({ finding }) {
  return (
    <div className="data-row relative overflow-hidden">
      {/* Left severity bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${severityBar[finding.severity] ?? severityBar.info}`} />
      <div className="pl-4 pr-3 py-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">
              {finding.agentName ?? "Apollo"}
            </div>
            <div className="mt-0.5 text-sm font-bold text-white/90">{finding.title}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {finding.approvalRequired && (
              <span className="chip chip-warning">approval</span>
            )}
            <span className={severityStyle[finding.severity] ?? severityStyle.info}>
              {finding.severity}
            </span>
          </div>
        </div>
        {finding.detail && (
          <p className="mt-2 text-xs leading-relaxed text-white/55">{finding.detail}</p>
        )}
        {finding.recommendation && (
          <p className="mt-1 text-xs leading-relaxed text-white/35">{finding.recommendation}</p>
        )}
      </div>
    </div>
  );
}

function AuditRunButton({ run, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(run.id)}
      className={`relative w-full rounded-lg border p-3 text-left transition-colors overflow-hidden ${
        selected
          ? "border-accent/40 bg-accent/8"
          : "border-white/[0.08] bg-black/[0.12] hover:border-white/[0.16] hover:bg-white/[0.035]"
      }`}
    >
      {/* Left status bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
        run.status === "completed" ? "bg-accent"
        : run.status === "failed" ? "bg-danger"
        : run.status === "blocked" ? "bg-warning"
        : "bg-bg-border"
      }`} />
      <div className="pl-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/35 font-semibold">{fmtDate(run.createdAt)}</div>
            <div className="mt-0.5 text-sm font-bold text-white/85 truncate">{run.summary}</div>
          </div>
          <span className={`${runStatusStyle[run.status] ?? runStatusStyle.queued} flex-shrink-0`}>
            {run.status}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-white/40">
          <span>{fmtRunType(run.runType)}</span>
          <span className="opacity-40">·</span>
          <span>{run.findingCount} findings</span>
          {run.approvalCount > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span className="text-warning">{run.approvalCount} approvals</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function ApolloAuditHistory({ auditState, selectedRunId, onSelectRun, onRefresh }) {
  const selectedRun = auditState.runs.find((r) => r.id === selectedRunId) ?? auditState.runs[0] ?? null;
  const loading = auditState.status === "loading";
  const refreshing = auditState.status === "refreshing";

  return (
    <section className="control-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Clock size={15} className="text-info" />
            <h3 className="font-display font-bold">Audit History</h3>
          </div>
          <p className="max-w-2xl text-sm text-white/45 leading-relaxed">
            Recorded Apollo runs and department findings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRefresh()}
          disabled={loading || refreshing}
          className="btn btn-secondary py-1.5 px-3 text-xs justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {auditState.error && (
        <div className="mb-4 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger">
          {auditState.error}
        </div>
      )}

      {loading && <SkeletonList count={3} variant="card" />}

      {!loading && auditState.runs.length === 0 && !auditState.error && (
        <EmptyState
          icon={<Clock size={24} />}
          title="No audit runs yet"
          body="Run a readiness check or department review to record the first entry."
          variant="compact"
        />
      )}

      {!loading && auditState.runs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          {/* Run list */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {auditState.runs.map((run) => (
              <AuditRunButton
                key={run.id}
                run={run}
                selected={run.id === selectedRun?.id}
                onSelect={onSelectRun}
              />
            ))}
          </div>

          {/* Selected run detail */}
          <div className="data-row p-4">
            {selectedRun ? (
              <Motion.div
                key={selectedRun.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[10px] text-white/35 font-semibold">{fmtDate(selectedRun.createdAt)}</div>
                    <div className="mt-1 font-display text-lg font-bold">{selectedRun.summary}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/40">
                      <span>{fmtRunType(selectedRun.runType)}</span>
                      <span className="opacity-40">·</span>
                      <span>{selectedRun.scope}</span>
                      <span className="opacity-40">·</span>
                      <span>{selectedRun.findingCount} findings</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={runStatusStyle[selectedRun.status] ?? runStatusStyle.queued}>
                      {selectedRun.status}
                    </span>
                    <span className={severityStyle[selectedRun.topSeverity] ?? severityStyle.info}>
                      {selectedRun.topSeverity}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {selectedRun.findings.map((f) => (
                    <FindingRow key={f.id} finding={f} />
                  ))}
                </div>
              </Motion.div>
            ) : (
              <div className="text-sm text-white/40 text-center py-8">Select a run to see findings</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ApolloCommandCenter({
  pendingProposalCount = 0,
  customDrillCount = 0,
  memberCount = 0,
}) {
  const { reload: reloadData } = useData();
  const [runnerState, setRunnerState] = useState({ status: "idle", result: null, error: "", checkType: "" });
  const [auditState, setAuditState] = useState({ status: "idle", runs: [], error: "" });
  const [selectedRunId, setSelectedRunId] = useState("");
  const [sparklines, setSparklines] = useState(null);
  const findings = runnerState.result?.report?.findings ?? [];

  const loadAuditHistory = useCallback(async (preferredRunId = "") => {
    setAuditState((s) => ({ status: s.runs.length > 0 ? "refreshing" : "loading", runs: s.runs, error: "" }));
    try {
      const runs = await fetchApolloAuditHistory();
      setAuditState({ status: "success", runs, error: "" });
      setSelectedRunId((cur) => {
        if (preferredRunId && runs.some((r) => r.id === preferredRunId)) return preferredRunId;
        if (cur && runs.some((r) => r.id === cur)) return cur;
        return runs[0]?.id ?? "";
      });
    } catch (err) {
      setAuditState((s) => ({
        status: "error", runs: s.runs,
        error: err instanceof Error ? err.message : "Audit history could not load.",
      }));
    }
  }, []);

  const loadSparklines = useCallback(async () => {
    try {
      const data = await fetchApolloSparklineData();
      setSparklines(data);
    } catch { /* non-critical: sparklines just stay null */ }
  }, []);

  useEffect(() => {
    loadAuditHistory();
    loadSparklines();
  }, [loadAuditHistory, loadSparklines]);

  const runCheck = async (checkType) => {
    setRunnerState({ status: "loading", result: null, error: "", checkType });
    try {
      const result = checkType === "departments"
        ? await runApolloDepartmentReview()
        : checkType === "heartbeat"
          ? await runApolloHeartbeatDryRun()
          : await runApolloReadinessCheck();
      setRunnerState({ status: "success", result, error: "", checkType });
      await loadAuditHistory(result.audit?.runId ?? "");
      await loadSparklines();
      // Department review can insert new drill-scout proposals — refresh
      // DataContext so the Agent Inbox picks them up without a page reload.
      if (checkType === "departments") {
        await reloadData();
      }
    } catch (err) {
      setRunnerState({
        status: "error", result: null, checkType,
        error: err instanceof Error ? err.message : "Apollo runner could not complete.",
      });
    }
  };

  // Map APOLLO_DEPARTMENTS to their agent key for sparkline lookup
  const deptKeyMap = {
    "Head of Security": "head_security",
    "Head of Cyber":    "head_cyber",
    "QA Lead":          "qa_lead",
    "Drill Scout":      "drill_scout",
  };

  return (
    <div className="space-y-5">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="command-surface p-5 md:p-6">
        <div className="relative z-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <div className="brand-overline mb-3">
              <Sparkles size={13} />
              Apollo Command
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">
              Commander online,<br className="hidden sm:block" /> autonomy locked.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
              Apollo is the command layer for GalGro's Academy. Every department reports upward,
              every risky action needs approval, and no agent gets to expand its own reach.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <StatusDot
                state={auditState.runs.some((r) => r.status === "completed") ? "live" : "idle"}
                label={`${auditState.runs.filter((r) => r.status === "completed").length} successful runs`}
              />
              {pendingProposalCount > 0 && (
                <StatusDot state="warn" label={`${pendingProposalCount} proposals pending`} />
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Command topology — each node reflects live department state:
                failed latest run → warn, no run yet → idle, else ok.
                Drill Scout also flips to warn when the approval queue has
                pending proposals. */}
            <CommandTopology
              title="Command topology"
              subtitle="Departments report upward before action"
              className="min-h-[230px]"
              departments={APOLLO_DEPARTMENTS
                .filter((d) => deptKeyMap[d.name])
                .map((d) => {
                  const key = deptKeyMap[d.name];
                  const runs = sparklines?.[key] ?? [];
                  const latest = runs[runs.length - 1];
                  let state = "idle";
                  if (latest?.status === "failed") state = "warn";
                  else if (latest) state = "ok";
                  if (key === "drill_scout" && pendingProposalCount > 0) state = "warn";
                  const shortLabel = {
                    head_security: "Security",
                    head_cyber:    "Cyber",
                    qa_lead:       "QA",
                    drill_scout:   "Scout",
                  }[key] ?? d.name;
                  return { key, label: shortLabel, state };
                })}
            />
            <div className="inspector-panel p-3">
              <div className="mb-2 flex items-center gap-2 quiet-label">
                <Shield size={12} className="text-accent" />
                Live context
              </div>
            <div className="flex flex-wrap gap-2">
              <StatChip label="Members" value={memberCount} variant="neutral" icon={<Users size={11} />} />
              <StatChip label="Proposals" value={pendingProposalCount} variant={pendingProposalCount > 0 ? "warning" : "neutral"} icon={<AlertTriangle size={11} />} />
              <StatChip label="Custom drills" value={customDrillCount} variant="accent" icon={<Sparkles size={11} />} />
              <StatChip label="Audit runs" value={auditState.runs.length} variant="info" icon={<Activity size={11} />} />
            </div>
            <div className="mt-3 border-t border-white/[0.07] pt-3">
              <div className="font-display text-lg font-bold text-white/90">Foundation only</div>
              <p className="mt-1 text-xs text-white/45">
                No background execution, no external tools, no production changes delegated yet.
              </p>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Operations status ────────────────────────────────────────── */}
      <ApolloOperationsStatus />

      {/* ── Approval inbox ───────────────────────────────────────────── */}
      <ApolloApprovalInbox onChange={() => loadAuditHistory()} />

      {/* ── Departments with sparklines ──────────────────────────────── */}
      <section className="control-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={15} className="text-info" />
          <h3 className="font-display font-bold">Departments</h3>
          <span className="chip chip-neutral ml-auto">{APOLLO_DEPARTMENTS.length} agents</span>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {APOLLO_DEPARTMENTS.map((dept) => {
            const agentKey = deptKeyMap[dept.name];
            const deptRuns = sparklines?.[agentKey] ?? [];
            const lastRun = deptRuns[deptRuns.length - 1];

            return (
              <div key={dept.name} className="data-row p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-bold text-sm">{dept.name}</div>
                  <StatusPill status={dept.status} />
                </div>

                {/* Sparkline row */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <DepartmentSparkline runs={deptRuns} />
                  {lastRun ? (
                    <span className={`${runStatusStyle[lastRun.status] ?? runStatusStyle.queued} text-[10px]`}>
                      last: {lastRun.status}
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/30">no runs yet</span>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-white/50">{dept.scope}</p>
                <p className="mt-2.5 border-t border-white/[0.07] pt-2.5 text-xs leading-relaxed text-white/35">
                  {dept.reports}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Server-side Runner ───────────────────────────────────────── */}
      <section className="control-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield size={15} className="text-accent" />
              <h3 className="font-display font-bold">Server-side Runner</h3>
            </div>
            <p className="max-w-2xl text-sm text-white/45 leading-relaxed">
              Manual readiness, department reviews, and heartbeat dry-runs. Uses your head-coach session for protected audit writes.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[540px]">
            {[
              { key: "readiness",  label: "Run readiness check",  loadingLabel: "Checking…" },
              { key: "departments",label: "Run department review", loadingLabel: "Reviewing…" },
              { key: "heartbeat",  label: "Heartbeat dry run",    loadingLabel: "Dry running…" },
            ].map(({ key, label, loadingLabel }) => (
              <button
                key={key}
                type="button"
                onClick={() => runCheck(key)}
                disabled={runnerState.status === "loading"}
                className={`btn justify-center disabled:cursor-not-allowed disabled:opacity-60 ${
                  key === "readiness" ? "btn-primary" : "btn-secondary"
                }`}
              >
                {runnerState.status === "loading" && runnerState.checkType === key
                  ? <><RefreshCw size={13} className="animate-spin" />{loadingLabel}</>
                  : label
                }
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {runnerState.error && (
            <Motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {runnerState.error}
            </Motion.div>
          )}
        </AnimatePresence>

        {runnerState.result && (
          <Motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Runner", value: runnerState.result.status },
                { label: "Audit", value: runnerState.result.audit?.status },
                { label: "Mode", value: runnerState.result.report?.mode },
              ].map(({ label, value }) => (
                <div key={label} className="data-row p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{label}</div>
                  <div className="mt-1 text-sm font-bold text-white/85">{value}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {findings.map((f) => (
                <FindingRow key={`${f.agentKey}-${f.title}`} finding={f} />
              ))}
            </div>
          </Motion.div>
        )}
      </section>

      {/* ── Chat ──────────────────────────────────────────────────────── */}
      <ApolloChat onAuditRecorded={loadAuditHistory} />

      {/* ── Memory ────────────────────────────────────────────────────── */}
      <ApolloMemory />

      {/* ── Audit history ─────────────────────────────────────────────── */}
      <ApolloAuditHistory
        auditState={auditState}
        selectedRunId={selectedRunId}
        onSelectRun={setSelectedRunId}
        onRefresh={loadAuditHistory}
      />

      {/* ── Charter + Departments reference ──────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="control-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-accent" />
            <h3 className="font-display font-bold">Apollo Charter</h3>
          </div>
          <div className="space-y-2">
            {APOLLO_PRINCIPLES.map((p) => (
              <div key={p.label} className="data-row p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/35 mb-0.5">{p.label}</div>
                <div className="text-sm font-semibold text-white/85">{p.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="control-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-orange" />
            <h3 className="font-display font-bold">Build Sequence</h3>
          </div>
          <div className="space-y-2">
            {APOLLO_FOUNDATION_STEPS.map((step) => (
              <div key={step.step} className="data-row p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{step.step}</div>
                    <div className="mt-0.5 font-bold text-sm">{step.title}</div>
                  </div>
                  <StatusPill status={step.status} />
                </div>
                <p className="mt-1.5 text-xs text-white/45 leading-relaxed">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Approval gates ───────────────────────────────────────────── */}
      <section className="control-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={15} className="text-accent" />
          <h3 className="font-display font-bold">Approval Gates</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {APOLLO_APPROVAL_TIERS.map((tier) => (
            <div key={tier.tier} className="data-row p-4">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between mb-2">
                <div className="font-bold text-sm">{tier.tier}</div>
                <span className="text-[11px] font-semibold text-accent/80">{tier.authority}</span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed">{tier.examples}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
