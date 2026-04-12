import { LayoutDashboard, BookOpen, Layers, Users, Calendar, Settings, LogOut, Shield } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { EMPTY_SESSION } from "../hooks/useSession";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import BrandMark from "./BrandMark";

const NAV = [
  { key: "dashboard", label: "Dashboard",       icon: LayoutDashboard },
  { key: "library",   label: "Drill Library",   icon: BookOpen },
  { key: "builder",   label: "Session Builder", icon: Layers },
  { key: "sessions",  label: "My Sessions",     icon: Calendar },
  { key: "players",   label: "Players",         icon: Users },
];

export default function Sidebar({ page, setPage, onOpenSettings }) {
  const [currentSession] = useLocalStorage("galgro-current-session", EMPTY_SESSION);
  const { profile, signOut, isCoach, canEdit } = useAuth();
  const { pendingProposalCount } = useData();

  const hasSessionInProgress = (currentSession?.blocks?.length ?? 0) > 0;

  const name     = profile?.name ?? "Coach";
  const initials = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  const roleLabel = {
    head_coach: "Head Coach",
    assistant:  "Assistant Coach",
    keeper:     "Goalkeeper",
    viewer:     "Viewer",
    revoked:    "Access Revoked",
  }[profile?.role] ?? "Member";
  const navItems = canEdit ? NAV : NAV.filter(({ key }) => key !== "builder" && key !== "players");

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-bg-soft border-r border-bg-border flex-col p-4 z-40">
      {/* Logo */}
      <BrandMark className="px-3 py-4 mb-6" glyphClassName="h-10 w-10" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ key, label, icon: Icon }) => {
          const active  = page === key;
          const showDot = key === "builder" && hasSessionInProgress && !active;
          return (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                active
                  ? "bg-gradient-to-r from-accent/15 to-electric/5 text-accent border border-accent/20"
                  : "text-white/50 hover:text-white hover:bg-bg-card"
              }`}
            >
              <span className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_#00e87a]" />
                )}
              </span>
              <span>{label}</span>
              {showDot && (
                <span className="ml-auto text-[10px] font-bold text-accent/80 bg-accent/10 px-1.5 py-0.5 rounded-full">
                  IN PROGRESS
                </span>
              )}
            </button>
          );
        })}

        {/* Admin — head coach only */}
        {isCoach && (
          <button
            onClick={() => setPage("admin")}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              page === "admin"
                ? "bg-gradient-to-r from-accent/15 to-electric/5 text-accent border border-accent/20"
                : "text-white/50 hover:text-white hover:bg-bg-card"
            }`}
          >
            <Shield size={18} />
            <span>Admin</span>
            {pendingProposalCount > 0 && page !== "admin" && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-black text-[10px] font-black flex items-center justify-center shadow-glow">
                {pendingProposalCount}
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-bg-border space-y-1">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-bg-card transition-colors"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-bg-card transition-colors"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-electric flex items-center justify-center text-sm font-black text-black flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="text-[11px] text-white/40">{roleLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
