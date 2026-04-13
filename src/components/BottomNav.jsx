import { LayoutDashboard, BookOpen, Layers, Users, Calendar, Shield } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { EMPTY_SESSION } from "../hooks/useSession";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { bottomNavTap } from "../utils/motion";

const NAV = [
  { key: "dashboard", label: "Home",     icon: LayoutDashboard },
  { key: "library",   label: "Drills",   icon: BookOpen },
  { key: "builder",   label: "Builder",  icon: Layers },
  { key: "sessions",  label: "Sessions", icon: Calendar },
  { key: "players",   label: "Players",  icon: Users },
];

export default function BottomNav({ page, setPage }) {
  const [currentSession] = useLocalStorage("galgro-current-session", EMPTY_SESSION);
  const { isCoach, canEdit } = useAuth();
  const { pendingProposalCount } = useData();
  const hasSessionInProgress = (currentSession?.blocks?.length ?? 0) > 0;

  // On mobile, replace "Players" with "Admin" for coaches so they can access the inbox
  const baseNav = canEdit ? NAV : NAV.filter(({ key }) => key !== "builder" && key !== "players");
  const nav = isCoach
    ? [...NAV.slice(0, 4), { key: "admin", label: "Admin", icon: Shield }]
    : baseNav;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-soft/95 backdrop-blur-lg border-t border-bg-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around">
        {nav.map(({ key, label, icon: Icon }) => {
          const active   = page === key;
          const showDot  = key === "builder" && hasSessionInProgress && !active;
          const showBadge = key === "admin" && pendingProposalCount > 0 && !active;
          return (
            <Motion.button
              key={key}
              onClick={() => setPage(key)}
              whileTap={bottomNavTap}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-w-0 transition-colors ${
                active ? "text-accent" : "text-white/50 active:text-white"
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {showDot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_#00ff87]" />
                )}
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-accent text-black text-[8px] font-black flex items-center justify-center">
                    {pendingProposalCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold tracking-tight">{label}</span>
              {active && (
                <Motion.span
                  layoutId="bottom-nav-active-indicator"
                  className="absolute top-0 left-[calc(50%-1.25rem)] h-0.5 w-10 rounded-b-full bg-accent shadow-[0_0_12px_rgba(0,232,122,0.45)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </Motion.button>
          );
        })}
      </div>
    </nav>
  );
}
