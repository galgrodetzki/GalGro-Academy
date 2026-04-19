import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, LogIn, UserPlus, Ticket } from "lucide-react";
import BrandMark from "../components/BrandMark";
import TacticalField from "../components/ui/TacticalField";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [code, setCode]         = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");

  const checkFirstAccount = async () => {
    const { data: firstAccount, error: rpcErr } = await supabase.rpc("is_first_account");
    if (!rpcErr && typeof firstAccount === "boolean") {
      return { isFirstUser: firstAccount, error: null };
    }

    const { count, error: countErr } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    return { isFirstUser: count === 0, error: countErr };
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setInfo("");

    if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }

    const { isFirstUser, error: firstAccountErr } = await checkFirstAccount();
    if (firstAccountErr) {
      setError("Could not check account access. Try again in a moment.");
      setLoading(false);
      return;
    }

    let inviteRole = "head_coach";
    let inviteId   = null;

    if (!isFirstUser) {
      // All subsequent signups require an invite code
      if (!code.trim()) {
        setError("An invite code is required to sign up. Ask your coach.");
        setLoading(false); return;
      }

      const { data: invite, error: invErr } = await supabase
        .from("invites")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .eq("used", false)
        .single();

      if (invErr || !invite) {
        setError("Invalid or already-used invite code. Check with your coach.");
        setLoading(false); return;
      }

      inviteRole = invite.role;
      inviteId   = invite.id;
    }

    // Create account
    const { data, error: signErr } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: name.trim(), role: inviteRole } },
    });

    if (signErr) { setError(signErr.message); setLoading(false); return; }

    // Mark invite as used (if applicable)
    if (inviteId && data.user) {
      const { error: usedErr } = await supabase.from("invites").update({ used: true, used_by: data.user.id }).eq("id", inviteId);
      if (usedErr) {
        setError("Account created, but the invite could not be marked as used. Ask your coach before sharing that code again.");
        setLoading(false);
        return;
      }
    }

    setInfo(isFirstUser
      ? "Head Coach account created! You can now sign in."
      : "Account created! You can now sign in.");
    setMode("signin");
    setLoading(false);
  };

  return (
    <div className="app-chrome flex min-h-screen items-center justify-center px-4 py-6 md:py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-lg border border-white/[0.08] bg-[#090d15]/92 shadow-[0_28px_90px_rgba(0,0,0,0.36)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="command-surface min-h-[280px] rounded-none border-0 p-6 md:min-h-[620px] md:p-10">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <BrandMark glyphClassName="h-12 w-12" textSize="text-xl" />
            <div className="max-w-md">
              <div className="brand-overline mb-4">Goalkeeper portal</div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
                Private academy workspace.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/58">
                Sessions, keeper notes, and drill work stay inside GalGro's Academy.
              </p>
            </div>
            <TacticalField
              title="Academy OS"
              subtitle="Plan, train, review"
              mode="command"
              className="my-6 hidden min-h-[220px] md:block"
            />
            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              <span className="border-t border-accent/40 pt-3">Plan</span>
              <span className="border-t border-electric/40 pt-3">Train</span>
              <span className="border-t border-white/20 pt-3">Review</span>
            </div>
          </div>
        </section>

        <section className="bg-black/[0.08] p-5 md:p-8 lg:p-10">
          <div className="mb-6">
            <div className="brand-overline mb-3">Secure access</div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Sign in to the academy" : "Create your academy account"}
            </h2>
            <p className="mt-1 text-sm text-white/45">Private access only.</p>
          </div>

          <div className="control-surface p-5 md:p-6">
          {/* Tab switcher */}
          <div className="tab-rail mb-6">
            <button
              onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
              className={`tab-button ${
                mode === "signin" ? "tab-button-active" : "tab-button-idle"
              }`}
            >
              <LogIn size={14} /> Sign in
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
              className={`tab-button ${
                mode === "signup" ? "tab-button-active" : "tab-button-idle"
              }`}
            >
              <UserPlus size={14} /> Sign up
            </button>
          </div>

          {info && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 text-sm text-accent mb-4">
              {info}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="label">Your name</label>
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min 6 characters"
                    className="input pr-10"
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Ticket size={11} /> Invite code</label>
                <input
                  type="text" value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GK-ABCD-1234"
                  className="input font-mono tracking-widest"
                  autoComplete="off"
                />
                <p className="text-[11px] text-white/30 mt-1.5">Required for all accounts except the first (Head Coach).</p>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3">
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
            </div>

            <p className="text-center text-xs text-white/20 mt-6">
              GalGro's Academy · Private access only
            </p>
        </section>
      </div>
    </div>
  );
}
