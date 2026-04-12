import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider, useData } from "./context/DataContext";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import MobileHeader from "./components/MobileHeader";
import SettingsModal from "./components/SettingsModal";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DrillLibrary from "./pages/DrillLibrary";
import SessionBuilder from "./pages/SessionBuilder";
import MySessions from "./pages/MySessions";
import Players from "./pages/Players";
import Admin from "./pages/Admin";

// ── Inner app (needs auth + data context) ────────────────────────────────────
function AppInner() {
  const { user, profile, loading, isCoach } = useAuth();
  const { hasLocalData, migrateFromLocalStorage, sessions, players } = useData();
  const [page, setPage] = useState("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated]   = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading academy…</p>
      </div>
    </div>
  );

  if (!user) return <Login />;

  const goTo = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

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
  const showMigration = !migrated && hasLocalData() && sessions.length === 0 && players.length === 0;

  return (
    <div className="min-h-screen">
      <Sidebar page={page} setPage={goTo} onOpenSettings={() => setSettingsOpen(true)} />
      <MobileHeader onOpenSettings={() => setSettingsOpen(true)} />
      <BottomNav page={page} setPage={goTo} />

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

        {page === "dashboard" && <Dashboard setPage={goTo} />}
        {page === "library"   && <DrillLibrary />}
        {page === "builder"   && <SessionBuilder />}
        {page === "sessions"  && <MySessions />}
        {page === "players"   && <Players />}
        {page === "admin"     && isCoach && <Admin />}
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
