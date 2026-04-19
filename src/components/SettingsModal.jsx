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
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/72 backdrop-blur-md"
          {...modalBackdropMotion}
        >
          <Motion.div
            className="modal-card w-full sm:max-w-md sm:rounded-lg rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            {...modalPanelMotion}
          >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
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
              className="input py-3"
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

        <div className="flex gap-3 px-6 py-4 border-t border-white/[0.07]">
          <button onClick={onClose} className="btn btn-secondary flex-1 justify-center py-3">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn btn-primary flex-1 justify-center py-3 disabled:opacity-60"
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
