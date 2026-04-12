import { useState, useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useData } from "../context/DataContext";
import { modalBackdropMotion, modalPanelMotion } from "../utils/motion";

export default function SettingsModal({ open, onClose }) {
  const { settings, saveSettings } = useData();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setDraft({ ...settings });
      setError("");
    }
  }, [open, settings]);

  if (!draft) return null;

  const save = async () => {
    setSaving(true);
    setError("");
    const saveError = await saveSettings(draft);
    setSaving(false);
    if (saveError) {
      setError(`Could not save settings: ${saveError.message}`);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
          {...modalBackdropMotion}
        >
          <Motion.div
            className="bg-bg-soft border border-bg-border w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
            {...modalPanelMotion}
          >
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border">
          <h2 className="text-lg font-display font-bold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-bg-card transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
              Coach Name
            </label>
            <input
              type="text"
              value={draft.coachName}
              onChange={(e) => setDraft((d) => ({ ...d, coachName: e.target.value }))}
              placeholder="Your name"
              className="w-full bg-bg-card border border-bg-border rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
              Default Session Length
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={15} max={120} step={5}
                value={draft.defaultTarget}
                onChange={(e) => setDraft((d) => ({ ...d, defaultTarget: Number(e.target.value) }))}
                className="flex-1 accent-[#00e87a]"
              />
              <span className="text-sm font-bold text-accent w-16 text-right">{draft.defaultTarget} min</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-bg-border">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-bg-border text-sm text-white/60 hover:text-white hover:bg-bg-card transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 rounded-lg bg-accent text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-60 transition-colors"
          >
            <Save size={15} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
