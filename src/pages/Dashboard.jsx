import { BookOpen, Layers, Users, Calendar, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { DRILLS, CATEGORIES } from "../data/drills";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

const STAT_ACCENTS = {
  accent: "bg-accent/10 text-accent",
  electric: "bg-electric/10 text-electric",
  orange: "bg-orange/10 text-orange",
  "electric-purple": "bg-electric-purple/10 text-electric-purple",
};

function StatCard({ icon: Icon, value, label, accent = "accent", gradient }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: gradient }}
      />
      <div className={`w-10 h-10 rounded-lg ${STAT_ACCENTS[accent] ?? STAT_ACCENTS.accent} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <div className="text-3xl font-black tracking-tight">{value}</div>
      <div className="text-xs text-white/50 font-medium mt-0.5">{label}</div>
    </div>
  );
}

export default function Dashboard({ setPage }) {
  const { sessions: savedSessions, players, customDrills } = useData();
  const totalDrills = DRILLS.length + customDrills.length;
  const totalCategories = CATEGORIES.length;
  const { profile, canEdit } = useAuth();
  const coachName = profile?.name ?? "Coach";
  const primaryAction = canEdit
    ? { page: "builder", label: "Start Building", icon: Layers }
    : { page: "sessions", label: "View Sessions", icon: Calendar };
  const PrimaryIcon = primaryAction.icon;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${coachName} 🥅`}
        subtitle="Your goalkeeping academy command center"
      />

      {/* Hero banner */}
      <div className="card p-5 md:p-6 mb-5 md:mb-6 relative overflow-hidden bg-gradient-to-br from-bg-card via-bg-card to-bg-card2 border-accent/20">
        <div className="absolute right-0 top-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent text-[11px] md:text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles size={14} />
            Welcome to GalGro's Academy
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold mb-2">
            {canEdit ? "Build your next session" : "Review your academy work"}
          </h2>
          <p className="text-white/60 text-sm max-w-xl mb-4">
            {canEdit
              ? `Drag-and-drop from your library of ${totalDrills} professional drills, organized across ${totalCategories} categories.`
              : `Browse ${totalDrills} goalkeeper drills and review your upcoming sessions.`}
          </p>
          <button onClick={() => setPage(primaryAction.page)} className="btn btn-primary">
            <PrimaryIcon size={16} />
            {primaryAction.label}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          icon={BookOpen}
          value={totalDrills}
          label="Drills in library"
          accent="accent"
          gradient="linear-gradient(90deg, #00ff87, transparent)"
        />
        <StatCard
          icon={Layers}
          value={totalCategories}
          label="Categories"
          accent="electric"
          gradient="linear-gradient(90deg, #4488ff, transparent)"
        />
        <StatCard
          icon={Calendar}
          value={savedSessions.length}
          label="Saved sessions"
          accent="orange"
          gradient="linear-gradient(90deg, #ff6b35, transparent)"
        />
        <StatCard
          icon={Users}
          value={players.length}
          label="Active players"
          accent="electric-purple"
          gradient="linear-gradient(90deg, #a855f7, transparent)"
        />
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <button onClick={() => setPage("library")} className="card card-hover p-5 text-left group">
          <BookOpen className="text-accent mb-3" size={22} />
          <div className="font-bold mb-1">Browse Drills</div>
          <div className="text-xs text-white/50">Explore your library of {totalDrills} drills</div>
        </button>
        {canEdit ? (
          <>
            <button onClick={() => setPage("builder")} className="card card-hover p-5 text-left group">
              <Layers className="text-electric mb-3" size={22} />
              <div className="font-bold mb-1">Build a Session</div>
              <div className="text-xs text-white/50">Drag-and-drop session planner</div>
            </button>
            <button onClick={() => setPage("players")} className="card card-hover p-5 text-left group">
              <Users className="text-orange mb-3" size={22} />
              <div className="font-bold mb-1">Manage Players</div>
              <div className="text-xs text-white/50">Your goalkeeper roster</div>
            </button>
          </>
        ) : (
          <button onClick={() => setPage("sessions")} className="card card-hover p-5 text-left group sm:col-span-2">
            <Calendar className="text-electric mb-3" size={22} />
            <div className="font-bold mb-1">My Sessions</div>
            <div className="text-xs text-white/50">Review upcoming and completed sessions</div>
          </button>
        )}
      </div>
    </div>
  );
}
