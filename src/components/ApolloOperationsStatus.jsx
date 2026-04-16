import { useCallback, useEffect, useState } from "react";
import { Activity, BrainCircuit, RadioTower, RefreshCw, ShieldCheck } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { fetchApolloStatus } from "../lib/apolloStatus";
import Skeleton from "./ui/Skeleton";

// Derive overall system state from model + heartbeat data
function deriveSystemState(model, heartbeat) {
  if (!model && !heartbeat) return "idle";
  const modelOk = model?.configured;
  const hbOk = heartbeat?.armed;
  if (modelOk && hbOk) return "live";
  if (modelOk || hbOk) return "warn";
  return "warn"; // partial config = warn, not idle
}

function StatusOrb({ state = "idle" }) {
  const config = {
    live: {
      outer: "bg-accent/10 border-accent/20",
      middle: "bg-accent/20",
      inner: "bg-accent",
      glow: "shadow-[0_0_24px_rgba(0,232,122,0.55)]",
      pulse: "animate-pulse-dot",
      label: "All systems live",
      labelColor: "text-accent",
    },
    warn: {
      outer: "bg-warning/10 border-warning/20",
      middle: "bg-warning/20",
      inner: "bg-warning",
      glow: "shadow-[0_0_24px_rgba(245,158,11,0.45)]",
      pulse: "",
      label: "Partial configuration",
      labelColor: "text-warning",
    },
    idle: {
      outer: "bg-bg-card2 border-bg-border",
      middle: "bg-white/10",
      inner: "bg-white/30",
      glow: "",
      pulse: "",
      label: "Locked — fallback mode",
      labelColor: "text-white/50",
    },
  }[state];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Orb */}
      <Motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border ${config.outer}`}
      >
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${config.middle}`}>
          <div className={`h-5 w-5 rounded-full ${config.inner} ${config.glow} ${config.pulse}`} />
        </div>
      </Motion.div>
      <span className={`text-[11px] font-semibold ${config.labelColor}`}>{config.label}</span>
    </div>
  );
}

function InfoRow({ label, value, tone = "neutral" }) {
  const toneClass = {
    ready: "text-accent",
    warn: "text-warning",
    neutral: "text-white/75",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-bg-border/50 last:border-0">
      <span className="text-[11px] text-white/40 uppercase tracking-wide font-semibold">{label}</span>
      <span className={`text-[11px] font-bold ${toneClass}`}>{value}</span>
    </div>
  );
}

export default function ApolloOperationsStatus() {
  const [state, setState] = useState({ status: "idle", data: null, error: "" });

  const loadStatus = useCallback(async () => {
    setState((s) => ({ status: s.data ? "refreshing" : "loading", data: s.data, error: "" }));
    try {
      const data = await fetchApolloStatus();
      setState({ status: "success", data, error: "" });
    } catch (err) {
      setState((s) => ({
        status: "error",
        data: s.data,
        error: err instanceof Error ? err.message : "Apollo status could not load.",
      }));
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const loading = state.status === "loading";
  const refreshing = state.status === "refreshing";
  const model = state.data?.model;
  const heartbeat = state.data?.heartbeat;
  const context = state.data?.context;
  const systemState = state.data ? deriveSystemState(model, heartbeat) : "idle";

  return (
    <section className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-info" />
          <h3 className="font-display font-bold text-sm">System Status</h3>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={loading || refreshing}
          className="btn btn-secondary py-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {state.error && (
        <div className="mb-4 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border border-bg-border p-4">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Center: orb */}
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4 flex flex-col items-center justify-center gap-3 order-first sm:order-none">
            <StatusOrb state={systemState} />
          </div>

          {/* Model cell */}
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BrainCircuit size={13} className="text-info" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">Model</span>
            </div>
            {model ? (
              <div>
                <div className={`font-display text-base font-bold mb-3 ${model.configured ? "text-accent" : "text-white/70"}`}>
                  {model.configured ? "Ready" : "Grounded only"}
                </div>
                <InfoRow label="auth" value={model.authMode} tone={model.configured ? "ready" : "warn"} />
                <InfoRow label="model" value={model.model} />
                <InfoRow label="mode" value={model.mode} tone={model.configured ? "ready" : "neutral"} />
              </div>
            ) : (
              <div className="text-xs text-white/40">Not loaded</div>
            )}
          </div>

          {/* Heartbeat + context cell */}
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <RadioTower size={13} className="text-info" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">Heartbeat</span>
            </div>
            {heartbeat ? (
              <div>
                <div className={`font-display text-base font-bold mb-3 ${heartbeat.armed ? "text-accent" : "text-warning"}`}>
                  {heartbeat.armed ? "Armed" : "Locked"}
                </div>
                <InfoRow label="enabled" value={heartbeat.enabled ? "yes" : "no"} tone={heartbeat.enabled ? "ready" : "warn"} />
                <InfoRow label="runner secret" value={heartbeat.runnerSecretConfigured ? "yes" : "no"} tone={heartbeat.runnerSecretConfigured ? "ready" : "warn"} />
                <InfoRow label="service role" value={heartbeat.serviceRoleConfigured ? "yes" : "no"} tone={heartbeat.serviceRoleConfigured ? "ready" : "warn"} />
              </div>
            ) : (
              <div className="text-xs text-white/40">Not loaded</div>
            )}

            {context && (
              <div className="mt-4 pt-3 border-t border-bg-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck size={12} className="text-white/30" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/30">Context packs</span>
                </div>
                <InfoRow label="ready" value={context.summary.ready} tone="ready" />
                <InfoRow label="partial" value={context.summary.partial} tone={context.summary.partial ? "warn" : "neutral"} />
                <InfoRow label="version" value={context.version} />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
