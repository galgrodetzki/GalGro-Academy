import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, LogIn, UserPlus, Ticket } from "lucide-react";
import BrandMark from "../components/BrandMark";

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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-electric/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <BrandMark className="mb-8 justify-center" glyphClassName="h-12 w-12" textSize="text-xl" />

        {/* Card */}
        <div className="card p-6">
          {/* Tab switcher */}
          <div className="flex bg-bg-soft border border-bg-border rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${
                mode === "signin" ? "bg-accent text-black" : "text-white/50"
              }`}
            >
              <LogIn size={14} /> Sign in
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${
                mode === "signup" ? "bg-accent text-black" : "text-white/50"
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
      </div>
    </div>
  );
}
