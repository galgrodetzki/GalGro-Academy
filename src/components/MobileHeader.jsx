import { Settings, LogOut } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import BrandMark from "./BrandMark";
import { navItemTap } from "../utils/motion";

export default function MobileHeader({ onOpenSettings }) {
  const { profile, signOut } = useAuth();
  const name     = profile?.name ?? "Coach";
  const initials = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.08] bg-[#090d15]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-between px-4 h-14">
        <BrandMark className="gap-2.5" glyphClassName="h-9 w-9" textSize="text-[13px]" compact />

        <div className="flex items-center gap-1">
          <Motion.button
            onClick={onOpenSettings}
            whileTap={navItemTap}
            className="rounded-lg p-2.5 text-white/55 transition-colors hover:text-white active:bg-white/[0.06]"
            aria-label="Settings"
          >
            <Settings size={20} />
          </Motion.button>
          <Motion.button
            onClick={signOut}
            whileTap={navItemTap}
            className="rounded-lg p-2.5 text-white/55 transition-colors hover:text-red-300 active:bg-white/[0.06]"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </Motion.button>
          <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-xs font-black text-accent">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
