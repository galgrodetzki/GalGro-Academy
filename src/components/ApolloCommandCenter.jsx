import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock,
  Key,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  APOLLO_APPROVAL_TIERS,
  APOLLO_DEPARTMENTS,
  APOLLO_FOUNDATION_STEPS,
  APOLLO_PRINCIPLES,
} from "../data/apollo";
import ApolloChat from "./ApolloChat";
import ApolloMemory from "./ApolloMemory";
import ApolloOperationsStatus from "./ApolloOperationsStatus";
import { fetchApolloAuditHistory } from "../lib/apolloAudit";
import {
  runApolloDepartmentReview,
  runApolloHeartbeatDryRun,
  runApolloReadinessCheck,
} from "../lib/apolloRunner";

const statusStyles = {
  Complete: "border-accent/30 bg-accent/10 text-accent",
  Existing: "border-accent/30 bg-accent/10 text-accent",
  Foundation: "border-electric/30 bg-electric/10 text-electric",
  "In progress": "border-accent/30 bg-accent/10 text-accent",
  Next: "border-electric/30 bg-electric/10 text-electric",
  Planned: "border-bg-border bg-bg-card2 text-white/55",
  Queued: "border-bg-border bg-bg-card2 text-white/55",
};

const severityStyles = {
  info: "border-electric/20 bg-electric/10 text-electric",
  low: "border-accent/20 bg-accent/10 text-accent",
  medium: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  high: "border-orange/30 bg-orange/10 text-orange",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
};

const runStatusStyles = {
  completed: "border-accent/20 bg-accent/10 text-accent",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
  blocked: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  running: "border-electric/20 bg-electric/10 text-electric",
  queued: "border-bg-border bg-bg-card2 text-white/55",
};

const auditDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatAuditDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return auditDateFormatter.format(date);
}

function formatRunType(value = "") {
  return String(value ?? "").replace(/_/g, " ");
}

function StatusPill({ status }) {
  return (
    <span className={`tag border normal-case tracking-normal ${statusStyles[status] ?? statusStyles.Planned}`}>
      {status}
    </span>
  );
}

function CommandMetric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
        <Icon size={13} className="text-accent" />
        {label}
      </div>
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-white/45">{detail}</div>
    </div>
  );
}

function AuditRunButton({ run, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(run.id)}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected
          ? "border-accent/40 bg-accent/10"
          : "border-bg-border bg-bg-soft hover:border-bg-card2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">
            {formatAuditDate(run.createdAt)}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-white/85">{run.summary}</div>
        </div>
        <span className={`tag shrink-0 border normal-case tracking-normal ${runStatusStyles[run.status] ?? runStatusStyles.queued}`}>
          {run.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
        <span>{formatRunType(run.runType)}</span>
        <span>/</span>
        <span>{run.findingCount} findings</span>
        {run.approvalCount > 0 && (
          <>
            <span>/</span>
            <span className="text-yellow-300">{run.approvalCount} approvals</span>
          </>
        )}
      </div>
    </button>
  );
}

function AuditFinding({ finding }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">
            {finding.agentName}
          </div>
          <div className="mt-1 text-sm font-bold text-white/85">{finding.title}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {finding.approvalRequired && (
            <span className="tag shrink-0 border border-yellow-500/30 bg-yellow-500/10 normal-case tracking-normal text-yellow-300">
              approval
            </span>
          )}
          <span className={`tag shrink-0 border normal-case tracking-normal ${severityStyles[finding.severity] ?? severityStyles.info}`}>
            {finding.severity}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/50">{finding.detail}</p>
      <p className="mt-2 text-xs leading-relaxed text-white/35">{finding.recommendation}</p>
    </div>
  );
}

function ApolloAuditHistory({ auditState, selectedRunId, onSelectRun, onRefresh }) {
  const selectedRun = auditState.runs.find((run) => run.id === selectedRunId) ?? auditState.runs[0] ?? null;
  const loading = auditState.status === "loading";
  const refreshing = auditState.status === "refreshing";

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Clock size={16} className="text-electric" />
            <h3 className="font-display font-bold">Audit History</h3>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">
            Recorded Apollo runs and department findings. This is the trail we review before any background agent is allowed to run.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRefresh()}
          disabled={loading || refreshing}
          className="btn btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh history"}
        </button>
      </div>

      {auditState.error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {auditState.error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-bg-border bg-bg-soft py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {!loading && auditState.runs.length === 0 && !auditState.error && (
        <div className="rounded-lg border border-bg-border bg-bg-soft p-8 text-center">
          <div className="text-sm font-bold text-white/65">No Apollo audit runs yet</div>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/40">
            Run a readiness check or department review to record the first audit entry.
          </p>
        </div>
      )}

      {!loading && auditState.runs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-2">
            {auditState.runs.map((run) => (
              <AuditRunButton
                key={run.id}
                run={run}
                selected={run.id === selectedRun?.id}
                onSelect={onSelectRun}
              />
            ))}
          </div>

          <div className="rounded-lg border border-bg-border bg-bg-card2 p-4">
            {selectedRun && (
              <>
                <div className="flex flex-col gap-3 border-b border-bg-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">
                      {formatAuditDate(selectedRun.createdAt)}
                    </div>
                    <div className="mt-1 font-display text-lg font-bold">{selectedRun.summary}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                      <span>{formatRunType(selectedRun.runType)}</span>
                      <span>/</span>
                      <span>{selectedRun.scope}</span>
                      <span>/</span>
                      <span>{selectedRun.findingCount} findings</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`tag border normal-case tracking-normal ${runStatusStyles[selectedRun.status] ?? runStatusStyles.queued}`}>
                      {selectedRun.status}
                    </span>
                    <span className={`tag border normal-case tracking-normal ${severityStyles[selectedRun.topSeverity] ?? severityStyles.info}`}>
                      {selectedRun.topSeverity}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedRun.findings.map((finding) => (
                    <AuditFinding key={finding.id} finding={finding} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function ApolloCommandCenter({
  pendingProposalCount = 0,
  customDrillCount = 0,
  memberCount = 0,
}) {
  const [runnerState, setRunnerState] = useState({
    status: "idle",
    result: null,
    error: "",
  });
  const [auditState, setAuditState] = useState({
    status: "idle",
    runs: [],
    error: "",
  });
  const [selectedRunId, setSelectedRunId] = useState("");
  const findings = runnerState.result?.report?.findings ?? [];
  const loadAuditHistory = useCallback(async (preferredRunId = "") => {
    setAuditState((current) => ({
      status: current.runs.length > 0 ? "refreshing" : "loading",
      runs: current.runs,
      error: "",
    }));

    try {
      const runs = await fetchApolloAuditHistory();
      setAuditState({ status: "success", runs, error: "" });
      setSelectedRunId((current) => {
        if (preferredRunId && runs.some((run) => run.id === preferredRunId)) return preferredRunId;
        if (current && runs.some((run) => run.id === current)) return current;
        return runs[0]?.id ?? "";
      });
    } catch (error) {
      setAuditState((current) => ({
        status: "error",
        runs: current.runs,
        error: error instanceof Error ? error.message : "Apollo audit history could not load.",
      }));
    }
  }, []);

  useEffect(() => {
    loadAuditHistory();
  }, [loadAuditHistory]);

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
    } catch (error) {
      setRunnerState({
        status: "error",
        result: null,
        error: error instanceof Error ? error.message : "Apollo runner could not complete.",
        checkType,
      });
    }
  };

  return (
    <div className="space-y-5">
      <section className="academy-panel p-5 md:p-6">
        <div className="relative z-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <div className="brand-overline mb-3">
              <Sparkles size={13} />
              Apollo Command
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Commander online, autonomy locked.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
              Apollo is the command layer for GalGro's Academy. Every department reports upward,
              every risky action needs approval, and no agent gets to expand its own reach.
            </p>
          </div>
          <div className="rounded-lg border border-accent/15 bg-bg-soft/75 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-accent/80">
              <Shield size={13} />
              Current mode
            </div>
            <div className="font-display text-xl font-bold">Foundation only</div>
            <p className="mt-2 text-sm text-white/50">
              No background execution, no external tools, and no production changes are delegated yet.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CommandMetric
          icon={Shield}
          label="Control"
          value="Approval gated"
          detail="Apollo can coordinate, not bypass you."
        />
        <CommandMetric
          icon={Bot}
          label="Departments"
          value={APOLLO_DEPARTMENTS.length}
          detail="Security, Cyber, QA, Product, Performance, Drill Scout."
        />
        <CommandMetric
          icon={Key}
          label="Access"
          value="Server-side"
          detail="Future secrets stay outside the React app."
        />
        <CommandMetric
          icon={Clock}
          label="Heartbeat"
          value="Dry run only"
          detail="Scheduled runs stay locked until the gates are approved."
        />
      </section>

      <ApolloOperationsStatus />

      <section className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Shield size={16} className="text-accent" />
              <h3 className="font-display font-bold">Server-side Runner</h3>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-white/50">
              Manual readiness, department reviews, and heartbeat dry-runs. Uses your head-coach session for protected audit writes, and keeps future scheduler secrets on the server.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[560px]">
            <button
              type="button"
              onClick={() => runCheck("readiness")}
              disabled={runnerState.status === "loading"}
              className="btn btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runnerState.status === "loading" && runnerState.checkType === "readiness" ? "Checking..." : "Run readiness check"}
            </button>
            <button
              type="button"
              onClick={() => runCheck("departments")}
              disabled={runnerState.status === "loading"}
              className="btn btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runnerState.status === "loading" && runnerState.checkType === "departments" ? "Reviewing..." : "Run department review"}
            </button>
            <button
              type="button"
              onClick={() => runCheck("heartbeat")}
              disabled={runnerState.status === "loading"}
              className="btn btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runnerState.status === "loading" && runnerState.checkType === "heartbeat" ? "Dry running..." : "Run heartbeat dry run"}
            </button>
          </div>
        </div>

        {runnerState.error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {runnerState.error}
          </div>
        )}

        {runnerState.result && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Runner</div>
                <div className="mt-1 text-sm font-bold text-white/85">{runnerState.result.status}</div>
              </div>
              <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Audit</div>
                <div className="mt-1 text-sm font-bold text-white/85">{runnerState.result.audit?.status}</div>
              </div>
              <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Mode</div>
                <div className="mt-1 text-sm font-bold text-white/85">{runnerState.result.report?.mode}</div>
              </div>
            </div>

            <div className="space-y-2">
              {findings.map((finding) => (
                <div key={`${finding.agentKey ?? "apollo"}-${finding.title}`} className="rounded-lg border border-bg-border bg-bg-soft p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">
                        {finding.agentName ?? "Apollo"}
                      </div>
                      <div className="mt-1 text-sm font-bold text-white/85">{finding.title}</div>
                    </div>
                    <span className={`tag border shrink-0 normal-case tracking-normal ${severityStyles[finding.severity] ?? severityStyles.info}`}>
                      {finding.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/50">{finding.detail}</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/35">{finding.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <ApolloChat onAuditRecorded={loadAuditHistory} />

      <ApolloMemory />

      <ApolloAuditHistory
        auditState={auditState}
        selectedRunId={selectedRunId}
        onSelectRun={setSelectedRunId}
        onRefresh={loadAuditHistory}
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            <h3 className="font-display font-bold">Apollo Charter</h3>
          </div>
          <div className="space-y-3">
            {APOLLO_PRINCIPLES.map((principle) => (
              <div key={principle.label} className="rounded-lg border border-bg-border bg-bg-soft p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{principle.label}</div>
                <div className="mt-1 text-sm font-semibold text-white/85">{principle.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot size={16} className="text-electric" />
            <h3 className="font-display font-bold">Departments</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {APOLLO_DEPARTMENTS.map((department) => (
              <div key={department.name} className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="font-bold text-sm">{department.name}</div>
                  <StatusPill status={department.status} />
                </div>
                <p className="text-xs leading-relaxed text-white/55">{department.scope}</p>
                <p className="mt-3 border-t border-bg-border pt-3 text-xs leading-relaxed text-white/40">{department.reports}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" />
            <h3 className="font-display font-bold">Approval Gates</h3>
          </div>
          <div className="space-y-3">
            {APOLLO_APPROVAL_TIERS.map((tier) => (
              <div key={tier.tier} className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-bold text-sm">{tier.tier}</div>
                  <span className="text-[11px] font-semibold text-accent/80">{tier.authority}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{tier.examples}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Zap size={16} className="text-orange" />
            <h3 className="font-display font-bold">Build Sequence</h3>
          </div>
          <div className="space-y-3">
            {APOLLO_FOUNDATION_STEPS.map((item) => (
              <div key={item.step} className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{item.step}</div>
                    <div className="mt-1 font-bold text-sm">{item.title}</div>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users size={16} className="text-electric" />
          <h3 className="font-display font-bold">Live Portal Context</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Members</div>
            <div className="mt-1 font-display text-2xl font-bold">{memberCount}</div>
          </div>
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Drill proposals</div>
            <div className="mt-1 font-display text-2xl font-bold">{pendingProposalCount}</div>
          </div>
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Custom drills</div>
            <div className="mt-1 font-display text-2xl font-bold">{customDrillCount}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
