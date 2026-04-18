import { LayoutDashboard, BookOpen, Layers, Users, Calendar, CalendarDays, Settings, LogOut, Shield, Palette } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { EMPTY_SESSION } from "../hooks/useSession";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import BrandMark from "./BrandMark";
import { navItemTap } from "../utils/motion";

const NAV = [
  { key: "dashboard", label: "Dashboard",       icon: LayoutDashboard },
  { key: "library",   label: "Drill Library",   icon: BookOpen },
  { key: "builder",   label: "Session Builder", icon: Layers },
  { key: "sessions",  label: "My Sessions",     icon: Calendar },
  { key: "calendar",  label: "Team Calendar",   icon: CalendarDays },
  { key: "players",   label: "Players",         icon: Users },
];

export default function Sidebar({ page, setPage, onOpenSettings }) {
  const [currentSession] = useLocalStorage("galgro-current-session", EMPTY_SESSION);
  const { profile, signOut, isCoach, canEdit, accessStatus } = useAuth();
  const { pendingProposalCount } = useData();

  const hasSessionInProgress = (currentSession?.blocks?.length ?? 0) > 0;

  const name     = profile?.name ?? "Coach";
  const initials = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  const baseRoleLabel = {
    head_coach: "Head Coach",
    assistant:  "Assistant Coach",
    keeper:     "Goalkeeper",
    viewer:     "Viewer",
    revoked:    "Access Revoked",
  }[profile?.role] ?? "Member";
  const roleLabel = accessStatus?.kind === "expires"
    ? `${baseRoleLabel} · ${accessStatus.label}`
    : baseRoleLabel;
  const navItems = canEdit ? NAV : NAV.filter(({ key }) => key !== "builder" && key !== "players");

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-bg-soft/95 border-r border-bg-border flex-col p-4 z-40">
      {/* Logo */}
      <BrandMark className="px-3 py-4 mb-5 border-b border-bg-border/70" glyphClassName="h-10 w-10" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ key, label, icon: Icon }) => {
          const active  = page === key;
          const showDot = key === "builder" && hasSessionInProgress && !active;
          return (
            <Motion.button
              key={key}
              onClick={() => setPage(key)}
              whileTap={navItemTap}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left overflow-hidden ${
                active
                  ? "text-accent border-accent/25 shadow-[inset_3px_0_0_rgba(0,232,122,0.95)]"
                  : "text-white/50 border-transparent hover:text-white hover:bg-bg-card"
              }`}
            >
              {active && (
                <Motion.span
                  layoutId="sidebar-active-surface"
                  className="absolute inset-0 rounded-lg bg-accent/10"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <span className="relative z-10">
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_#00e87a]" />
                )}
              </span>
              <span className="relative z-10">{label}</span>
              {showDot && (
                <span className="relative z-10 ml-auto text-[10px] font-bold text-accent/80 bg-accent/10 px-1.5 py-0.5 rounded-full">
                  IN PROGRESS
                </span>
              )}
            </Motion.button>
          );
        })}

        {/* Admin — head coach only */}
        {isCoach && (
          <Motion.button
            onClick={() => setPage("admin")}
            whileTap={navItemTap}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left overflow-hidden ${
              page === "admin"
                ? "text-accent border-accent/25 shadow-[inset_3px_0_0_rgba(0,232,122,0.95)]"
                : "text-white/50 border-transparent hover:text-white hover:bg-bg-card"
            }`}
          >
            {page === "admin" && (
              <Motion.span
                layoutId="sidebar-active-surface"
                className="absolute inset-0 rounded-lg bg-accent/10"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <Shield className="relative z-10" size={18} />
            <span className="relative z-10">Admin</span>
            {pendingProposalCount > 0 && page !== "admin" && (
              <span className="relative z-10 ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-black text-[10px] font-black flex items-center justify-center shadow-glow">
                {pendingProposalCount}
              </span>
            )}
          </Motion.button>
        )}

        {/* Styleguide — head coach only, design system reference */}
        {isCoach && (
          <Motion.button
            onClick={() => setPage("styleguide")}
            whileTap={navItemTap}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left overflow-hidden ${
              page === "styleguide"
                ? "text-accent border-accent/25 shadow-[inset_3px_0_0_rgba(0,232,122,0.95)]"
                : "text-white/50 border-transparent hover:text-white hover:bg-bg-card"
            }`}
          >
            {page === "styleguide" && (
              <Motion.span
                layoutId="sidebar-active-surface"
                className="absolute inset-0 rounded-lg bg-accent/10"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <Palette className="relative z-10" size={18} />
            <span className="relative z-10">Styleguide</span>
          </Motion.button>
        )}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-bg-border space-y-1">
        <Motion.button
          onClick={onOpenSettings}
          whileTap={navItemTap}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-bg-card transition-colors"
        >
          <Settings size={18} />
          <span>Settings</span>
        </Motion.button>
        <Motion.button
          onClick={signOut}
          whileTap={navItemTap}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-bg-card transition-colors"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </Motion.button>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="w-9 h-9 rounded-lg border border-accent/30 bg-accent/10 flex items-center justify-center text-sm font-black text-accent flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="truncate text-[11px] text-white/40">{roleLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
