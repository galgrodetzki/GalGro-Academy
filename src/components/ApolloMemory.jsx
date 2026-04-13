import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import {
  createApolloMemory,
  deleteApolloMemory,
  fetchApolloMemory,
  updateApolloMemory,
} from "../lib/apolloMemory";

const blankForm = {
  id: "",
  key: "",
  type: "project",
  sensitivity: "internal",
  title: "",
  body: "",
};

const memoryTypes = ["project", "preference", "decision", "security", "roadmap"];
const sensitivities = ["public", "internal", "restricted"];

function formatMemoryDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function MemoryBadge({ children }) {
  return (
    <span className="tag border border-bg-border bg-bg-card2 normal-case tracking-normal text-white/55">
      {children}
    </span>
  );
}

export default function ApolloMemory({ onMemoryChanged }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const editing = Boolean(form.id);
  const canSave = form.title.trim().length > 0 && form.body.trim().length > 0 && status !== "saving";
  const typeCounts = useMemo(() => (
    entries.reduce((counts, entry) => {
      counts[entry.type] = (counts[entry.type] ?? 0) + 1;
      return counts;
    }, {})
  ), [entries]);

  const loadMemory = useCallback(async () => {
    setStatus((current) => (current === "idle" ? "loading" : "refreshing"));
    setError("");

    try {
      const nextEntries = await fetchApolloMemory();
      setEntries(nextEntries);
      setStatus("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Apollo memory could not load.");
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const resetForm = () => {
    setForm(blankForm);
    setError("");
  };

  const saveMemory = async (event) => {
    event.preventDefault();
    if (!canSave) return;

    setStatus("saving");
    setError("");

    try {
      const saved = editing
        ? await updateApolloMemory(form)
        : await createApolloMemory(form);
      setEntries((current) => (
        editing
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...current]
      ));
      setForm(blankForm);
      setStatus("idle");
      onMemoryChanged?.();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Apollo memory could not be saved.");
      setStatus("idle");
    }
  };

  const startEdit = (entry) => {
    setForm({
      id: entry.id,
      key: entry.key,
      type: entry.type,
      sensitivity: entry.sensitivity,
      title: entry.title,
      body: entry.body,
    });
    setError("");
  };

  const removeMemory = async (entry) => {
    const confirmed = window.confirm(`Delete Apollo memory: "${entry.title}"?`);
    if (!confirmed) return;

    setStatus("saving");
    setError("");

    try {
      await deleteApolloMemory(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (form.id === entry.id) setForm(blankForm);
      setStatus("idle");
      onMemoryChanged?.();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Apollo memory could not be deleted.");
      setStatus("idle");
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Brain size={16} className="text-accent" />
            <h3 className="font-display font-bold">Apollo Memory</h3>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">
            Teach Apollo stable project facts, decisions, roadmap notes, and preferences. Do not store secrets here.
          </p>
        </div>
        <button
          type="button"
          onClick={loadMemory}
          disabled={status === "loading" || status === "refreshing" || status === "saving"}
          className="btn btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={status === "refreshing" ? "animate-spin" : ""} />
          Refresh memory
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={saveMemory} className="rounded-lg border border-bg-border bg-bg-card2 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white/85">{editing ? "Edit memory" : "Add memory"}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Internal entries are included in Apollo context packs by default. Restricted entries stay excluded unless explicitly enabled server-side.
              </p>
            </div>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                aria-label="Cancel memory edit"
                className="rounded-lg border border-bg-border bg-bg-soft p-2 text-white/50 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="label mb-1 block">Memory type</span>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                className="input"
              >
                {memoryTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label mb-1 block">Sensitivity</span>
              <select
                value={form.sensitivity}
                onChange={(event) => setForm((current) => ({ ...current, sensitivity: event.target.value }))}
                className="input"
              >
                {sensitivities.map((sensitivity) => (
                  <option key={sensitivity} value={sensitivity}>{sensitivity}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="label mb-1 block">Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={120}
              placeholder="Example: Apollo roadmap decision"
              className="input"
            />
          </label>

          <label className="mt-3 block">
            <span className="label mb-1 block">Memory</span>
            <textarea
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              rows={6}
              maxLength={2000}
              placeholder="Write the stable fact, decision, or preference Apollo should remember."
              className="input min-h-36 resize-none"
            />
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={!canSave}
              className="btn btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editing ? <Save size={14} /> : <Plus size={14} />}
              {status === "saving" ? "Saving..." : editing ? "Update memory" : "Add memory"}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} className="btn btn-secondary justify-center">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="rounded-lg border border-bg-border bg-bg-card2 p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-bold text-white/85">Memory entries</div>
              <p className="mt-1 text-xs text-white/40">{entries.length} stored entries</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <MemoryBadge key={type}>{type}: {count}</MemoryBadge>
              ))}
            </div>
          </div>

          {status === "loading" && (
            <div className="flex items-center justify-center rounded-lg border border-bg-border bg-bg-soft py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}

          {status !== "loading" && entries.length === 0 && (
            <div className="rounded-lg border border-bg-border bg-bg-soft p-8 text-center">
              <div className="text-sm font-bold text-white/65">No Apollo memory yet</div>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/40">
                Add one stable decision or preference to make the next Apollo answer more grounded.
              </p>
            </div>
          )}

          {status !== "loading" && entries.length > 0 && (
            <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-bg-border bg-bg-soft p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <MemoryBadge>{entry.type}</MemoryBadge>
                        <MemoryBadge>{entry.sensitivity}</MemoryBadge>
                      </div>
                      <div className="mt-2 text-sm font-bold text-white/85">{entry.title}</div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/50">{entry.body}</p>
                      <div className="mt-3 text-[11px] text-white/30">Updated {formatMemoryDate(entry.updatedAt)}</div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        aria-label={`Edit ${entry.title}`}
                        className="rounded-lg border border-bg-border bg-bg-card2 p-2 text-white/50 transition-colors hover:border-electric/40 hover:text-electric"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMemory(entry)}
                        aria-label={`Delete ${entry.title}`}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 transition-colors hover:border-red-500/50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
