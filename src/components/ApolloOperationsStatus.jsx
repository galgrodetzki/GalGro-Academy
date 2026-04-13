import { useCallback, useEffect, useState } from "react";
import { Activity, BrainCircuit, RefreshCw, RadioTower } from "lucide-react";
import { fetchApolloStatus } from "../lib/apolloStatus";

function StatusCell({ icon: Icon, label, value, detail, tone = "neutral" }) {
  const toneClass = tone === "ready"
    ? "border-accent/30 bg-accent/10 text-accent"
    : tone === "warning"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      : "border-bg-border bg-bg-soft text-white/65";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-70">
        <Icon size={13} />
        {label}
      </div>
      <div className="font-display text-lg font-bold text-white">{value}</div>
      <p className="mt-2 text-xs leading-relaxed text-white/45">{detail}</p>
    </div>
  );
}

export default function ApolloOperationsStatus() {
  const [state, setState] = useState({
    status: "idle",
    data: null,
    error: "",
  });

  const loadStatus = useCallback(async () => {
    setState((current) => ({
      status: current.data ? "refreshing" : "loading",
      data: current.data,
      error: "",
    }));

    try {
      const data = await fetchApolloStatus();
      setState({ status: "success", data, error: "" });
    } catch (error) {
      setState((current) => ({
        status: "error",
        data: current.data,
        error: error instanceof Error ? error.message : "Apollo status could not load.",
      }));
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const loading = state.status === "loading";
  const refreshing = state.status === "refreshing";
  const model = state.data?.model;
  const heartbeat = state.data?.heartbeat;
  const context = state.data?.context;

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Activity size={16} className="text-electric" />
            <h3 className="font-display font-bold">Apollo Operations</h3>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">
            Server-side readiness for model reasoning, heartbeat gates, and context packs.
          </p>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={loading || refreshing}
          className="btn btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh status
        </button>
      </div>

      {state.error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-bg-border bg-bg-soft py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <StatusCell
            icon={BrainCircuit}
            label="Model"
            value={model?.configured ? "Model ready" : "Grounded only"}
            detail={model?.message ?? "Apollo status has not loaded yet."}
            tone={model?.configured ? "ready" : "warning"}
          />
          <StatusCell
            icon={RadioTower}
            label="Heartbeat"
            value={heartbeat?.armed ? "Armed" : "Dry run only"}
            detail={heartbeat?.message ?? "Apollo status has not loaded yet."}
            tone={heartbeat?.armed ? "ready" : "warning"}
          />
          <StatusCell
            icon={Activity}
            label="Context"
            value={context ? `${context.summary.ready} ready / ${context.summary.partial} partial` : "Not loaded"}
            detail={context ? `Context pack version ${context.version}.` : "Apollo context status has not loaded yet."}
            tone={context?.summary.partial ? "warning" : "ready"}
          />
        </div>
      )}
    </section>
  );
}
