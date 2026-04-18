import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Edit3,
  Plus,
  Play,
  RefreshCcw,
  Save,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import {
  TEMPLATE_VARIABLES,
  TRIGGER_TYPES,
  createMentorTemplate,
  deleteMentorTemplate,
  fetchMentorTemplates,
  setMentorTemplateEnabled,
  updateMentorTemplate,
} from "../lib/mentorTemplates";
import {
  fetchMyMentorMessages,
  runMentorGenerator,
} from "../lib/mentorMessages";

// Mentor-B2: template authoring panel for the head coach.
// Lives under the Admin "Mentor" tab. CRUD over `mentor_templates`. Templates
// power Mentor-C's daily generator — the body can use {{placeholders}} that
// the server substitutes when writing a per-keeper mentor_message.

const EMPTY_FORM = {
  triggerType: "training_day",
  title: "",
  body: "",
  tagsInput: "",
};

function triggerLabel(value) {
  return TRIGGER_TYPES.find((t) => t.value === value)?.label ?? value;
}

function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function MentorTemplatesPanel({ isCoach, onToast }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const reloadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      // Coach passes no keeperProfileId → RLS policy lets head coach read all rows.
      const rows = await fetchMyMentorMessages({ limit: 20 });
      setActivity(rows);
    } catch (err) {
      // Non-fatal — coach can still manage templates.
      onToast?.(err?.message || "Could not load Mentor activity.");
    } finally {
      setActivityLoading(false);
    }
  }, [onToast]);

  const handleGenerateNow = async () => {
    if (!isCoach) return;
    setGenerating(true);
    try {
      const report = await runMentorGenerator();
      const createdCount = Array.isArray(report?.created) ? report.created.length : 0;
      const skippedCount = Array.isArray(report?.skipped) ? report.skipped.length : 0;
      const errorCount = Array.isArray(report?.errors) ? report.errors.length : 0;
      onToast?.(
        errorCount > 0
          ? `Generated ${createdCount} new, ${skippedCount} dupes, ${errorCount} errors.`
          : `Generated ${createdCount} new, ${skippedCount} dupes.`
      );
      await reloadActivity();
    } catch (err) {
      onToast?.(err?.message || "Could not run generator.");
    } finally {
      setGenerating(false);
    }
  };

  const reload = useCallback(async () => {
    try {
      setError("");
      const rows = await fetchMentorTemplates();
      setTemplates(rows);
    } catch (err) {
      setError(err?.message || "Could not load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    reloadActivity();
  }, [reload, reloadActivity]);

  const grouped = useMemo(() => {
    const byTrigger = new Map();
    TRIGGER_TYPES.forEach((t) => byTrigger.set(t.value, []));
    templates.forEach((tpl) => {
      const list = byTrigger.get(tpl.triggerType) || [];
      list.push(tpl);
      byTrigger.set(tpl.triggerType, list);
    });
    return byTrigger;
  }, [templates]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (tpl) => {
    setEditingId(tpl.id);
    setForm({
      triggerType: tpl.triggerType,
      title: tpl.title,
      body: tpl.body,
      tagsInput: tpl.tags.join(", "),
    });
  };

  const insertToken = (token) => {
    setForm((prev) => ({ ...prev, body: `${prev.body}${prev.body.endsWith(" ") || !prev.body ? "" : " "}${token}` }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!isCoach) {
      onToast?.("Only the head coach can edit Mentor templates.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        triggerType: form.triggerType,
        title: form.title,
        body: form.body,
        tags: parseTags(form.tagsInput),
      };
      if (editingId) {
        const updated = await updateMentorTemplate(editingId, payload);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        onToast?.("Template updated.");
      } else {
        const created = await createMentorTemplate(payload);
        setTemplates((prev) => [created, ...prev]);
        onToast?.("Template added.");
      }
      resetForm();
    } catch (err) {
      onToast?.(err?.message || "Could not save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl) => {
    if (!isCoach) return;
    if (!confirm(`Delete "${tpl.title}"?`)) return;
    try {
      await deleteMentorTemplate(tpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      if (editingId === tpl.id) resetForm();
      onToast?.("Template removed.");
    } catch (err) {
      onToast?.(err?.message || "Could not delete.");
    }
  };

  const handleToggle = async (tpl) => {
    if (!isCoach) return;
    try {
      const updated = await setMentorTemplateEnabled(tpl.id, !tpl.enabled);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      onToast?.(err?.message || "Could not toggle.");
    }
  };

  return (
    <div>
      <div className="card p-4 mb-5 border-accent/20 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <BookOpenCheck size={15} className="text-accent" />
        </div>
        <div>
          <div className="font-bold text-sm mb-0.5">Mentor templates</div>
          <p className="text-xs text-white/50 leading-relaxed">
            Write the message templates Mentor uses to ghost-write to your keepers. Pick a trigger (training day, game-day eve, game day) and write the body — use{" "}
            <code className="text-accent bg-bg-soft px-1 rounded">{"{{placeholders}}"}</code> for keeper-specific details. The daily generator substitutes them when it writes each keeper's message.
          </p>
        </div>
      </div>

      {/* Generator + recent activity (Mentor-C) */}
      <div className="card p-4 mb-5 border border-bg-border">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Send size={14} className="text-accent" />
            <span className="text-sm font-bold">Daily generator</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reloadActivity}
              disabled={activityLoading}
              className="text-[11px] text-white/50 hover:text-white transition-colors flex items-center gap-1 disabled:opacity-40"
              title="Refresh activity"
            >
              <RefreshCcw size={11} className={activityLoading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleGenerateNow}
              disabled={generating || !isCoach}
              className="px-3 py-1.5 rounded-lg bg-accent text-black text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Play size={11} />
              {generating ? "Generating…" : "Generate now"}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed mb-3">
          Runs daily at 06:00 UTC. Writes a personalized message per keeper for every enabled template that matches today's training sessions or today/tomorrow's games. The unique constraint makes re-runs safe — duplicates are skipped.
        </p>

        {activity.length === 0 ? (
          <div className="text-[11px] text-white/40">
            No Mentor messages generated yet. Add a template and hit Generate now, or wait for the daily run.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-auto">
            {activity.slice(0, 10).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 text-[11px] bg-bg-soft/70 rounded-md px-2 py-1.5 border border-bg-border"
              >
                <span className="text-white/30 font-mono text-[10px]">
                  {m.triggerDate}
                </span>
                <span className="text-accent/80 font-bold">
                  {m.triggerType.replace(/_/g, " ")}
                </span>
                <span className="text-white/70 truncate flex-1" title={m.body}>
                  {m.title}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    m.status === "unread"
                      ? "text-accent bg-accent/10"
                      : m.status === "read"
                        ? "text-white/40 bg-bg-soft"
                        : "text-white/30 bg-bg-soft"
                  }`}
                >
                  {m.status}
                </span>
              </div>
            ))}
            {activity.length > 10 && (
              <div className="text-[10px] text-white/30 text-center pt-1">
                {activity.length - 10} more…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Placeholder reference */}
      <div className="card p-4 mb-5 border border-bg-border">
        <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
          Placeholders
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => insertToken(v.token)}
              title={v.description}
              className="text-[11px] font-mono text-accent bg-accent/10 hover:bg-accent/20 border border-accent/25 rounded-md px-2 py-1 transition-colors"
            >
              {v.token}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/40 mt-2">
          Click a placeholder to insert it into the body below. Unknown placeholders stay literal.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="card p-5 mb-6 border border-bg-border">
        <div className="flex items-center gap-2 mb-4">
          {editingId ? <Edit3 size={15} className="text-accent" /> : <Plus size={15} className="text-accent" />}
          <h3 className="font-display font-bold text-sm">
            {editingId ? "Edit template" : "Add template"}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Trigger
            </span>
            <select
              required
              value={form.triggerType}
              onChange={(e) => setForm((p) => ({ ...p, triggerType: e.target.value }))}
              className="mt-1 w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Title
            </span>
            <input
              type="text"
              required
              placeholder="e.g. Training day prep"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="mt-1 w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Body
          </span>
          <textarea
            required
            rows={5}
            placeholder="Write what Mentor will say. Use placeholders like {{keeper_name}} and {{opponent}}."
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            className="mt-1 w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent font-mono leading-relaxed"
          />
        </label>

        <label className="block mb-4">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Tags <span className="text-white/30 normal-case">(comma separated, optional)</span>
          </span>
          <input
            type="text"
            placeholder="warmup, mindset"
            value={form.tagsInput}
            onChange={(e) => setForm((p) => ({ ...p, tagsInput: e.target.value }))}
            className="mt-1 w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || !isCoach}
            className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            {editingId ? <Save size={13} /> : <Plus size={13} />}
            {editingId ? "Save changes" : "Add template"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 rounded-lg border border-bg-border text-white/60 hover:text-white text-xs font-bold flex items-center gap-1.5"
            >
              <X size={13} />
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List by trigger */}
      {error && (
        <div className="card p-3 mb-4 border-red-500/30 bg-red-500/5 text-xs text-red-300">
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-xs text-white/40">Loading templates…</div>
      ) : (
        TRIGGER_TYPES.map((trigger) => {
          const list = grouped.get(trigger.value) || [];
          return (
            <div key={trigger.value} className="mb-6">
              <div className="flex items-baseline gap-2 mb-2">
                <h4 className="font-display font-bold text-sm">{trigger.label}</h4>
                <span className="text-[10px] text-white/30">
                  {list.length} {list.length === 1 ? "template" : "templates"}
                </span>
              </div>
              <p className="text-[11px] text-white/40 mb-3">{trigger.help}</p>
              {list.length === 0 ? (
                <div className="card p-4 border border-dashed border-bg-border text-center text-xs text-white/40">
                  No templates yet for {trigger.label.toLowerCase()}. Add one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {list.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`card p-4 border transition-colors ${
                        tpl.enabled ? "border-bg-border" : "border-bg-border/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-bold">{tpl.title}</span>
                            <span className="text-[10px] text-white/30 bg-bg-soft px-2 py-0.5 rounded-full">
                              {triggerLabel(tpl.triggerType)}
                            </span>
                            {!tpl.enabled && (
                              <span className="text-[10px] text-white/30 bg-bg-soft px-2 py-0.5 rounded-full">
                                disabled
                              </span>
                            )}
                            {tpl.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] text-accent/80 bg-accent/10 px-2 py-0.5 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-mono">
                            {tpl.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggle(tpl)}
                            className={`p-1 transition-colors ${
                              tpl.enabled ? "text-accent hover:text-accent/80" : "text-white/30 hover:text-white"
                            }`}
                            title={tpl.enabled ? "Disable" : "Enable"}
                          >
                            {tpl.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(tpl)}
                            className="text-white/30 hover:text-accent transition-colors p-1"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tpl)}
                            className="text-white/25 hover:text-red-400 transition-colors p-1"
                            title="Delete"
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
          );
        })
      )}
    </div>
  );
}
