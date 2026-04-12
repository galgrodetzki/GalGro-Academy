import { Settings, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function MobileHeader({ onOpenSettings }) {
  const { profile, signOut } = useAuth();
  const name     = profile?.name ?? "Coach";
  const initials = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-bg-soft/95 backdrop-blur-lg border-b border-bg-border pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-electric flex items-center justify-center text-base font-black text-black shadow-glow">
            GG
          </div>
          <div className="leading-tight">
            <div className="font-display text-[13px] font-bold bg-gradient-to-br from-accent to-electric bg-clip-text text-transparent">
              GalGro's
            </div>
            <div className="font-display text-[13px] font-bold -mt-0.5 text-white">Academy</div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-lg text-white/60 hover:text-white active:bg-bg-card transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={signOut}
            className="p-2.5 rounded-lg text-white/60 hover:text-red-400 active:bg-bg-card transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-electric flex items-center justify-center text-xs font-black text-black ml-1">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
