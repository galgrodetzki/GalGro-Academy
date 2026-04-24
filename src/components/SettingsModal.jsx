import { useState, useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { firstNameOf, updateOwnProfileDetails } from "../lib/keeperProfile";
import MentorPushToggle from "./MentorPushToggle";
import { modalBackdropMotion, modalPanelMotion } from "../utils/motion";

export default function SettingsModal({ open, onClose }) {
  const { settings, saveSettings } = useData();
  const { user, profile, isKeeper, fetchProfile } = useAuth();
  const [draft, setDraft] = useState(null);
  const [keeperDraft, setKeeperDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setDraft({ ...settings });
      if (isKeeper) {
        setKeeperDraft({
          preferredName: profile?.preferred_name ?? firstNameOf(profile?.name) ?? "",
          birthday: profile?.birthday ?? "",
          currentFocus: profile?.current_focus ?? "",
          idol: profile?.idol ?? "",
          bio: profile?.bio ?? "",
        });
      } else {
        setKeeperDraft(null);
      }
      setError("");
    }
  }, [open, settings, isKeeper, profile]);

  if (!draft) return null;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      if (isKeeper && keeperDraft) {
        const fallbackName = firstNameOf(profile?.name) || "Keeper";
        await updateOwnProfileDetails({
          preferredName: keeperDraft.preferredName?.trim() || fallbackName,
          birthday: keeperDraft.birthday || null,
          currentFocus: keeperDraft.currentFocus ?? "",
          idol: keeperDraft.idol ?? "",
          bio: keeperDraft.bio ?? "",
        });
        if (user?.id) await fetchProfile(user.id);
      } else {
        const saveError = await saveSettings(draft);
        if (saveError) throw saveError;
      }
      onClose();
    } catch (err) {
      setError(`Could not save settings: ${err?.message || "Try again."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/72 backdrop-blur-md"
          {...modalBackdropMotion}
        >
          <Motion.div
            className="modal-card w-full sm:max-w-md sm:rounded-lg rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[92vh] flex flex-col"
            {...modalPanelMotion}
          >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
          <h2 className="text-lg font-display font-bold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-bg-card transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {isKeeper && keeperDraft ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    What should we call you?
                  </label>
                  <input
                    type="text"
                    value={keeperDraft.preferredName}
                    onChange={(e) => setKeeperDraft((d) => ({ ...d, preferredName: e.target.value }))}
                    placeholder={firstNameOf(profile?.name) || "e.g. Mo"}
                    maxLength={30}
                    className="w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={keeperDraft.birthday}
                    onChange={(e) => setKeeperDraft((d) => ({ ...d, birthday: e.target.value }))}
                    className="w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  />
                  <p className="text-[11px] text-white/40 mt-1">
                    Year is optional — Mentor only uses the month and day.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    What are you working on?
                  </label>
                  <input
                    type="text"
                    value={keeperDraft.currentFocus}
                    onChange={(e) => setKeeperDraft((d) => ({ ...d, currentFocus: e.target.value }))}
                    placeholder="e.g. reading crosses, footwork under pressure"
                    maxLength={100}
                    className="w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    Keeper you look up to
                  </label>
                  <input
                    type="text"
                    value={keeperDraft.idol}
                    onChange={(e) => setKeeperDraft((d) => ({ ...d, idol: e.target.value }))}
                    placeholder="e.g. Courtois, Neuer, Alisson"
                    maxLength={60}
                    className="w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    One line about you
                  </label>
                  <textarea
                    value={keeperDraft.bio}
                    onChange={(e) => setKeeperDraft((d) => ({ ...d, bio: e.target.value }))}
                    placeholder="e.g. #1 since U-12, fearless on crosses"
                    maxLength={200}
                    rows={2}
                    className="w-full bg-bg-soft border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.07]">
                <MentorPushToggle />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/[0.07] flex-shrink-0">
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
