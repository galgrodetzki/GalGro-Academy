import { lazy, Suspense, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider, useData } from "./context/DataContext";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import MobileHeader from "./components/MobileHeader";
import SettingsModal from "./components/SettingsModal";
import BrandMark, { BrandGlyph } from "./components/BrandMark";
import { pageMotion } from "./utils/motion";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DrillLibrary = lazy(() => import("./pages/DrillLibrary"));
const SessionBuilder = lazy(() => import("./pages/SessionBuilder"));
const MySessions = lazy(() => import("./pages/MySessions"));
const Players = lazy(() => import("./pages/Players"));
const Admin = lazy(() => import("./pages/Admin"));

function LoadingState({ label = "Loading academy..." }) {
  return (
    <div className="min-h-[45vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <BrandGlyph className="h-10 w-10 animate-pulse" title="Loading GalGro's Academy" />
        <p className="text-white/40 text-sm">{label}</p>
      </div>
    </div>
  );
}

function AccessBlocked({ accessStatus, onSignOut }) {
  const expired = accessStatus?.kind === "expired";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-6 text-center">
        <BrandMark className="mb-6 justify-center" glyphClassName="h-11 w-11" textSize="text-lg" />
        <h1 className="font-display text-2xl font-bold mb-2">
          {expired ? "Access expired" : "Access revoked"}
        </h1>
        <p className="text-sm text-white/55 leading-relaxed mb-6">
          {expired
            ? "This account's access period has ended. Ask the head coach if this should be extended."
            : "This account no longer has access to GalGro's Academy. Ask the head coach if you think this should be restored."}
        </p>
        <button onClick={onSignOut} className="btn btn-secondary w-full justify-center">
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Inner app (needs auth + data context) ────────────────────────────────────
function AppInner() {
  const { user, loading, isCoach, isAccessBlocked, accessStatus, canEdit, signOut } = useAuth();
  const { hasLocalData, migrateFromLocalStorage, sessions, players } = useData();
  const [page, setPage] = useState("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated]   = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingState />
    </div>
  );

  if (!user) return (
    <Suspense fallback={<LoadingState label="Loading sign in..." />}>
      <Login />
    </Suspense>
  );

  if (isAccessBlocked) return <AccessBlocked accessStatus={accessStatus} onSignOut={signOut} />;

  const canAccessPage = (p) => {
    if (p === "admin") return isCoach;
    if (p === "builder" || p === "players") return canEdit;
    return true;
  };
  const activePage = canAccessPage(page) ? page : "dashboard";
  const goTo = (p) => {
    setPage(canAccessPage(p) ? p : "dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const doMigrate = async () => {
    setMigrating(true);
    const result = await migrateFromLocalStorage();
    setMigrating(false);
    setMigrated(true);
    setMigrateMsg(result.ok
      ? `✓ Migrated ${result.count} items to the cloud.`
      : `Migration failed: ${result.error}`);
  };

  // Show migration banner if localStorage has data and cloud is empty
  const showMigration = canEdit && !migrated && hasLocalData() && sessions.length === 0 && players.length === 0;

  return (
    <div className="min-h-screen">
      <Sidebar page={activePage} setPage={goTo} onOpenSettings={() => setSettingsOpen(true)} />
      <MobileHeader onOpenSettings={() => setSettingsOpen(true)} />
      <BottomNav page={activePage} setPage={goTo} />

      <main className="md:ml-60 max-w-[1600px] px-4 pt-16 pb-24 md:px-8 md:pt-8 md:pb-8">

        {/* One-time migration banner */}
        {showMigration && (
          <div className="card border-accent/30 bg-accent/5 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-accent">You have local data on this device</div>
              <div className="text-xs text-white/50 mt-0.5">
                Move your sessions and players from this browser to the cloud so they sync everywhere.
              </div>
            </div>
            <button onClick={doMigrate} disabled={migrating} className="btn btn-primary whitespace-nowrap">
              {migrating ? "Migrating…" : "Migrate to cloud"}
            </button>
          </div>
        )}
        {migrated && (
          <div className="card border-emerald-500/30 bg-emerald-500/5 p-4 mb-6 text-sm text-emerald-400">
            {migrateMsg}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <Motion.div key={activePage} {...pageMotion}>
            <Suspense fallback={<LoadingState label="Loading page..." />}>
              {activePage === "dashboard" && <Dashboard setPage={goTo} />}
              {activePage === "library"   && <DrillLibrary />}
              {activePage === "builder"   && <SessionBuilder />}
              {activePage === "sessions"  && <MySessions />}
              {activePage === "players"   && <Players />}
              {activePage === "admin"     && isCoach && <Admin />}
            </Suspense>
          </Motion.div>
        </AnimatePresence>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

// ── Root: wrap with providers ─────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </AuthProvider>
  );
}
