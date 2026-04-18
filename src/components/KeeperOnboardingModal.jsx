import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { firstNameOf, updateOwnProfileDetails } from "../lib/keeperProfile";

// Mentor-E1: one-time onboarding for keepers so Mentor messages feel
// personal. All fields except preferred_name are optional — the keeper can
// skip and come back later. Saving always sets preferred_name (defaulting
// to the first word of their auth name) so the gate in
// needsKeeperOnboarding() clears and we don't re-prompt every login.

export default function KeeperOnboardingModal({ profile, onDone }) {
  const defaultPreferred = firstNameOf(profile?.name) || "";
  const [preferredName, setPreferredName] = useState(defaultPreferred);
  const [birthday, setBirthday] = useState("");
  const [currentFocus, setCurrentFocus] = useState("");
  const [idol, setIdol] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Clear default when profile prop changes (rare — mostly defensive).
  useEffect(() => {
    setPreferredName(firstNameOf(profile?.name) || "");
  }, [profile?.id, profile?.name]);

  const handleSave = async ({ skip = false } = {}) => {
    setSaving(true);
    setError("");
    try {
      // Skipping still writes preferred_name (defaulted to first name) so
      // the modal doesn't re-fire every session. Everything else left blank.
      await updateOwnProfileDetails({
        preferredName: skip ? defaultPreferred || "Keeper" : preferredName || defaultPreferred || "Keeper",
        birthday: skip ? null : (birthday || null),
        currentFocus: skip ? "" : currentFocus,
        idol: skip ? "" : idol,
        bio: skip ? "" : bio,
      });
      await onDone?.();
    } catch (err) {
      setError(err?.message || "Could not save — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keeper-onboard-title"
    >
      <div className="card w-full max-w-lg border border-bg-border p-6 md:p-7 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <h2 id="keeper-onboard-title" className="text-lg md:text-xl font-black mb-0.5">
              Welcome to the squad{defaultPreferred ? `, ${defaultPreferred}` : ""}!
            </h2>
            <p className="text-xs text-white/60 leading-relaxed">
              A couple of details so Mentor can write notes that feel like they
              know you. You can always change these later.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="What should we call you?" required>
            <input
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder={defaultPreferred || "e.g. Mo"}
              maxLength={30}
              className="w-full bg-bg-tertiary border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </Field>

          <Field label="Birthday">
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full bg-bg-tertiary border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
            <p className="text-[11px] text-white/40 mt-1">
              So Mentor can drop a note on your birthday. Year is optional — use any.
            </p>
          </Field>

          <Field label="What are you working on right now?">
            <input
              type="text"
              value={currentFocus}
              onChange={(e) => setCurrentFocus(e.target.value)}
              placeholder="e.g. reading crosses, footwork under pressure"
              maxLength={100}
              className="w-full bg-bg-tertiary border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </Field>

          <Field label="Keeper you look up to">
            <input
              type="text"
              value={idol}
              onChange={(e) => setIdol(e.target.value)}
              placeholder="e.g. Courtois, Neuer, Alisson"
              maxLength={60}
              className="w-full bg-bg-tertiary border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </Field>

          <Field label="One line about you">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. #1 since U-12, fearless on crosses, love a good save video"
              maxLength={200}
              rows={2}
              className="w-full bg-bg-tertiary border border-bg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent resize-none"
            />
          </Field>
        </div>

        {error && (
          <p className="text-xs text-red-300 mt-3">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => handleSave({ skip: true })}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-[12px] font-bold text-white/60 hover:text-white disabled:opacity-40"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !(preferredName || defaultPreferred).trim()}
            className="px-4 py-2 rounded-lg bg-accent text-black text-[12px] font-bold disabled:opacity-40 flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            Save and continue
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold uppercase tracking-wide text-white/50 mb-1.5">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </div>
      {children}
    </label>
  );
}
