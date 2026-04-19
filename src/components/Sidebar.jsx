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
  const adminItems = [
    isCoach ? { key: "admin", label: "Admin", icon: Shield, badge: pendingProposalCount } : null,
    isCoach ? { key: "styleguide", label: "Styleguide", icon: Palette } : null,
  ].filter(Boolean);

  const renderNavButton = ({ key, label, icon: Icon, badge }) => {
    const active = page === key;
    const showDot = key === "builder" && hasSessionInProgress && !active;
    const showBadge = badge > 0 && !active;

    return (
      <Motion.button
        key={key}
        onClick={() => setPage(key)}
        whileTap={navItemTap}
        className={`group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
          active
            ? "border-white/[0.12] bg-white/[0.065] text-white"
            : "border-transparent text-white/50 hover:bg-white/[0.045] hover:text-white/85"
        }`}
      >
        {active && (
          <Motion.span
            layoutId="sidebar-active-surface"
            className="absolute inset-0 rounded-lg bg-white/[0.035]"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          />
        )}
        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.035] text-white/55 transition-colors group-hover:text-white">
          <Icon size={17} strokeWidth={active ? 2.4 : 2} className={active ? "text-accent" : ""} />
          {showDot && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,232,122,0.75)]" />
          )}
        </span>
        <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span>
        {showDot && (
          <span className="relative z-10 rounded-full border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-accent/85">
            Live
          </span>
        )}
        {showBadge && (
          <span className="relative z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-black">
            {badge}
          </span>
        )}
      </Motion.button>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/[0.08] bg-[#090d15]/95 p-4 backdrop-blur-xl md:flex">
      <div className="mb-5 border-b border-white/[0.07] px-2 pb-5 pt-2">
        <BrandMark glyphClassName="h-10 w-10" />
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Portal</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent/85">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,232,122,0.7)]" />
            Live
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5">
        <div>
          <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">Workspace</div>
          <div className="flex flex-col gap-1">{navItems.map(renderNavButton)}</div>
        </div>

        {adminItems.length > 0 && (
          <div>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">Command</div>
            <div className="flex flex-col gap-1">{adminItems.map(renderNavButton)}</div>
          </div>
        )}
      </nav>

      <div className="space-y-1 border-t border-white/[0.07] pt-4">
        <Motion.button
          onClick={onOpenSettings}
          whileTap={navItemTap}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/45 transition-colors hover:bg-white/[0.045] hover:text-white/85"
        >
          <Settings size={18} />
          <span>Settings</span>
        </Motion.button>
        <Motion.button
          onClick={signOut}
          whileTap={navItemTap}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/45 transition-colors hover:bg-white/[0.045] hover:text-red-300"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </Motion.button>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/[0.075] bg-white/[0.035] px-3 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-sm font-black text-accent">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{name}</div>
            <div className="truncate text-[11px] text-white/40">{roleLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
