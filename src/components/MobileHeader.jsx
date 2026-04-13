import { Settings, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandMark from "./BrandMark";

export default function MobileHeader({ onOpenSettings }) {
  const { profile, signOut } = useAuth();
  const name     = profile?.name ?? "Coach";
  const initials = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-bg-soft/95 backdrop-blur-lg border-b border-bg-border pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <BrandMark className="gap-2.5" glyphClassName="h-9 w-9" textSize="text-[13px]" compact />

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
          <div className="w-8 h-8 rounded-lg border border-accent/30 bg-accent/10 flex items-center justify-center text-xs font-black text-accent ml-1">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
