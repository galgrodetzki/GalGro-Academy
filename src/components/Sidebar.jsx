import { LayoutDashboard, BookOpen, Layers, Users, Calendar, Settings } from "lucide-react";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "library", label: "Drill Library", icon: BookOpen },
  { key: "builder", label: "Session Builder", icon: Layers },
  { key: "sessions", label: "My Sessions", icon: Calendar },
  { key: "players", label: "Players", icon: Users },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-bg-soft border-r border-bg-border flex flex-col p-4 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-electric flex items-center justify-center text-xl font-black text-black shadow-glow">
          GG
        </div>
        <div>
          <div className="font-display text-[15px] font-bold leading-tight tracking-tight bg-gradient-to-br from-accent to-electric bg-clip-text text-transparent">
            GalGro's
          </div>
          <div className="font-display text-[15px] font-bold leading-tight -mt-0.5 text-white">
            Academy
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ key, label, icon: Icon }) => {
          const active = page === key;
          return (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                active
                  ? "bg-gradient-to-r from-accent/15 to-electric/5 text-accent border border-accent/20"
                  : "text-white/50 hover:text-white hover:bg-bg-card"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-bg-border">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-bg-card transition-colors">
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-3 mt-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-electric flex items-center justify-center text-sm font-black text-black">
            G
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Gal</div>
            <div className="text-[11px] text-white/40">GK Coach</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
