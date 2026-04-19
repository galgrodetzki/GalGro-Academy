import { useCallback, useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ShieldCheck, Clock, RefreshCw,
  AlertTriangle, Inbox, History, Loader2, MessageSquareMore, RotateCcw, Undo2,
} from "lucide-react";
import {
  fetchApprovals, decideApproval, retryApprovalExecution, undoAccessRevoke,
} from "../lib/apolloApprovals";
import { SkeletonList } from "./ui/Skeleton";
import EmptyState from "./ui/EmptyState";

// ── Style maps ──────────────────────────────────────────────────────────────

const riskStyle = {
  low:      "chip chip-success",
  medium:   "chip chip-warning",
  high:     "bg-orange/10 text-orange border-orange/30 chip",
  critical: "chip chip-danger",
};

const tierStyle = {
  recommend:          "chip chip-info",
  approval_required:  "chip chip-warning",
};

const tierLabel = {
  recommend:          "recommend",
  approval_required:  "approval required",
};

const decisionStyle = {
  pending:   "chip chip-warning",
  approved:  "chip chip-info",
  rejected:  "chip chip-neutral",
  completed: "chip chip-success",
  expired:   "chip chip-neutral",
};

// ── Formatting ──────────────────────────────────────────────────────────────

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});
function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

// 13J-2: pull a human-readable one-liner out of an action's execution_result.
// Actions return arbitrary JSON (profile IDs, proposal IDs, role flips,
// skipped reasons) — we strip bare IDs and keep the meaningful keys so the
// inbox shows "role: revoked" instead of a wall of UUIDs.
function fmtExecutionResult(result) {
  if (!result || typeof result !== "object") return null;
  const entries = Object.entries(result).filter(([k, v]) => {
    if (v === null || v === undefined || v === "") return false;
    // Hide raw ID fields — they add noise without telling you what happened.
    return !/id$/i.test(k);
  });
  if (entries.length === 0) return "executed";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

// ── Row ─────────────────────────────────────────────────────────────────────

function PendingApprovalRow({ approval, onDecide, busy }) {
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const finding = approval.finding;

  return (
    <div className="data-row relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        approval.risk_level === "high" || approval.risk_level === "critical"
          ? "bg-orange"
          : approval.risk_level === "medium"
          ? "bg-warning"
          : "bg-info"
      }`} />
      <div className="pl-4 pr-3 py-3 space-y-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
              <span>{finding?.agent_key ?? approval.requested_by ?? "apollo"}</span>
              <span className="opacity-40">·</span>
              <span>{fmtDate(approval.created_at)}</span>
            </div>
            <div className="mt-0.5 text-sm font-bold text-white/90">
              {approval.action_label || approval.action_key}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            <span className={tierStyle[approval.autonomy_tier] ?? tierStyle.approval_required}>
              {tierLabel[approval.autonomy_tier] ?? approval.autonomy_tier}
            </span>
            <span className={riskStyle[approval.risk_level] ?? riskStyle.medium}>
              {approval.risk_level} risk
            </span>
          </div>
        </div>

        {finding?.title && (
          <div className="text-xs leading-relaxed text-white/70">
            <span className="font-semibold text-white/85">{finding.title}</span>
            {finding.finding && (
              <p className="mt-1 text-white/50">{finding.finding}</p>
            )}
            {finding.recommendation && (
              <p className="mt-1 text-white/35">↪ {finding.recommendation}</p>
            )}
          </div>
        )}

        <AnimatePresence>
          {showNotes && (
            <Motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional decision note (why, constraints, follow-ups…)"
                className="input text-xs min-h-[56px] resize-y"
                disabled={busy}
              />
            </Motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onDecide(approval.id, "approve", notes)}
            disabled={busy}
            className="btn btn-primary py-1.5 px-3 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Approve & run
          </button>
          <button
            type="button"
            onClick={() => onDecide(approval.id, "reject", notes)}
            disabled={busy}
            className="btn btn-secondary py-1.5 px-3 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <XCircle size={12} />
            Reject
          </button>
          <button
            type="button"
            onClick={() => setShowNotes((s) => !s)}
            className="btn btn-ghost py-1.5 px-2 text-[11px] text-white/50 hover:text-white"
          >
            <MessageSquareMore size={12} />
            {showNotes ? "Hide note" : "Add note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DecidedApprovalRow({ approval, onRetry, retrying, onUndo, undoing }) {
  const finding = approval.finding;
  const status = approval.status;
  // 13J-1: retry is only offered when the server will actually allow it —
  // status "approved" with an execution_error set. Any other state (rejected,
  // completed, or approved-without-error) means there's nothing to retry.
  const canRetry = status === "approved" && Boolean(approval.execution_error);
  const resultSummary = fmtExecutionResult(approval.execution_result);
  // 13J-3: Undo is offered only for completed access.revoke rows that have a
  // previousRole snapshot. Server enforces the real gate (dedup + validity),
  // this is just the UI hint.
  const canUndo =
    status === "completed" &&
    approval.action_key === "access.revoke" &&
    approval.execution_result?.previousRole &&
    approval.execution_result.previousRole !== "revoked";

  return (
    <div className="data-row px-4 py-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/30">
            <span>{finding?.agent_key ?? "apollo"}</span>
            <span className="opacity-40">·</span>
            <span>{fmtDate(approval.decided_at ?? approval.created_at)}</span>
          </div>
          <div className="mt-0.5 text-sm font-semibold text-white/70">
            {approval.action_label || approval.action_key}
          </div>
          {approval.decision_notes && (
            <div className="mt-1 text-[11px] italic text-white/40">"{approval.decision_notes}"</div>
          )}
          {/* 13J-2: show what actually happened on successful executions. */}
          {status === "completed" && resultSummary && (
            <div className="mt-1 text-[11px] text-success">
              ✓ {resultSummary}
            </div>
          )}
          {approval.execution_error && (
            <div className="mt-1 text-[11px] text-danger">
              Execution error: {approval.execution_error}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canRetry && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(approval.id)}
              disabled={retrying}
              className="btn btn-secondary py-1 px-2 text-[11px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {retrying
                ? <Loader2 size={11} className="animate-spin" />
                : <RotateCcw size={11} />}
              Retry
            </button>
          )}
          {canUndo && onUndo && (
            <button
              type="button"
              onClick={() => onUndo(approval.id)}
              disabled={undoing}
              title={`Queue restore to role: ${approval.execution_result.previousRole}`}
              className="btn btn-secondary py-1 px-2 text-[11px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {undoing
                ? <Loader2 size={11} className="animate-spin" />
                : <Undo2 size={11} />}
              Undo
            </button>
          )}
          <span className={`${decisionStyle[status] ?? decisionStyle.pending}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ApolloApprovalInbox({ onChange }) {
  const [pending, setPending] = useState([]);
  const [decided, setDecided] = useState([]);
  const [view, setView] = useState("pending"); // "pending" | "history"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async (mode = "initial") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [pendingRows, allRows] = await Promise.all([
        fetchApprovals({ status: "pending" }),
        fetchApprovals({ status: "all" }),
      ]);
      setPending(pendingRows);
      setDecided(allRows.filter((a) => a.status !== "pending"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load approvals.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load("initial");
  }, [load]);

  const handleDecide = async (approvalId, decision, notes) => {
    setBusyId(approvalId);
    setError("");
    try {
      const result = await decideApproval({ approvalId, decision, notes });
      if (result.executed === false && result.error) {
        setError(`Approved but execution failed: ${result.error}`);
      }
      await load("refresh");
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${decision} approval.`);
    } finally {
      setBusyId("");
    }
  };

  // 13J-1: re-run an approved action whose execution errored. Shares busyId
  // with decide so a single approval can't be acted on twice in parallel.
  const handleRetry = async (approvalId) => {
    setBusyId(approvalId);
    setError("");
    try {
      const result = await retryApprovalExecution({ approvalId });
      if (result.ok === false && result.error) {
        setError(`Retry still failed: ${result.error}`);
      }
      await load("refresh");
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retry approval.");
    } finally {
      setBusyId("");
    }
  };

  // 13J-3: Queue a restore approval that reverses a completed access.revoke.
  // The restore itself is NOT auto-executed — it lands in pending and the head
  // coach still has to approve it through the normal flow. Once queued we flip
  // the view to "pending" so the new row is immediately visible.
  const handleUndo = async (approvalId) => {
    setBusyId(approvalId);
    setError("");
    try {
      await undoAccessRevoke({ approvalId });
      await load("refresh");
      setView("pending");
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue undo.");
    } finally {
      setBusyId("");
    }
  };

  const pendingCount = pending.length;
  const rows = view === "pending" ? pending : decided;

  return (
    <section className="control-surface p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck size={15} className="text-accent" />
            <h3 className="font-display font-bold">Approval Inbox</h3>
            {pendingCount > 0 && (
              <span className="chip chip-warning">{pendingCount} pending</span>
            )}
          </div>
          <p className="max-w-2xl text-sm text-white/45 leading-relaxed">
            Department agents queue actions here. Approve to let Apollo run them; reject to close them out.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="tab-rail">
            <button
              type="button"
              onClick={() => setView("pending")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                view === "pending" ? "bg-accent text-black" : "text-white/60 hover:text-white"
              }`}
            >
              <Inbox size={11} /> Pending
              {pendingCount > 0 && (
                <span className={`text-[10px] font-bold px-1 rounded ${
                  view === "pending" ? "bg-black/15 text-black" : "bg-bg-card2 text-white/50"
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setView("history")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                view === "history" ? "bg-accent text-black" : "text-white/60 hover:text-white"
              }`}
            >
              <History size={11} /> History
            </button>
          </div>
          <button
            type="button"
            onClick={() => load("refresh")}
            disabled={loading || refreshing}
            className="btn btn-secondary py-1.5 px-3 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && <SkeletonList count={2} variant="card" />}

      {!loading && rows.length === 0 && view === "pending" && (
        <EmptyState
          icon={<ShieldCheck size={24} />}
          title="No approvals waiting"
          body="Department agents will surface items here when they need your decision. Run a department review to see if anything pops up."
          variant="compact"
        />
      )}

      {!loading && rows.length === 0 && view === "history" && (
        <EmptyState
          icon={<Clock size={24} />}
          title="No decided approvals yet"
          body="Once you approve or reject pending items they'll show up in this history."
          variant="compact"
        />
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {rows.map((approval) => (
              <Motion.div
                key={approval.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {view === "pending" ? (
                  <PendingApprovalRow
                    approval={approval}
                    busy={busyId === approval.id}
                    onDecide={handleDecide}
                  />
                ) : (
                  <DecidedApprovalRow
                    approval={approval}
                    onRetry={handleRetry}
                    retrying={busyId === approval.id}
                    onUndo={handleUndo}
                    undoing={busyId === approval.id}
                  />
                )}
              </Motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
