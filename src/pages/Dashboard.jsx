import { BookOpen, Layers, Users, Calendar, TrendingUp, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { DRILLS, CATEGORIES } from "../data/drills";

function StatCard({ icon: Icon, value, label, accent = "accent", gradient }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: gradient }}
      />
      <div className={`w-10 h-10 rounded-lg bg-${accent}/10 text-${accent} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <div className="text-3xl font-black tracking-tight">{value}</div>
      <div className="text-xs text-white/50 font-medium mt-0.5">{label}</div>
    </div>
  );
}

export default function Dashboard({ setPage }) {
  const totalDrills = DRILLS.length;
  const totalCategories = CATEGORIES.length;

  return (
    <div>
      <PageHeader
        title="Welcome back, Gal 🥅"
        subtitle="Your goalkeeping academy command center"
      />

      {/* Hero banner */}
      <div className="card p-6 mb-6 relative overflow-hidden bg-gradient-to-br from-bg-card via-bg-card to-bg-card2 border-accent/20">
        <div className="absolute right-0 top-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles size={14} />
            Welcome to GalGro's Academy
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Build your next session</h2>
          <p className="text-white/60 text-sm max-w-xl mb-4">
            Drag-and-drop from your library of 95 professional drills, organized across 13 categories. Create structured sessions with warmup, main work, and cooldown blocks.
          </p>
          <button onClick={() => setPage("builder")} className="btn btn-primary">
            <Layers size={16} />
            Start Building
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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
          value="0"
          label="Sessions planned"
          accent="orange"
          gradient="linear-gradient(90deg, #ff6b35, transparent)"
        />
        <StatCard
          icon={Users}
          value="0"
          label="Active players"
          accent="electric-purple"
          gradient="linear-gradient(90deg, #a855f7, transparent)"
        />
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setPage("library")} className="card card-hover p-5 text-left group">
          <BookOpen className="text-accent mb-3" size={22} />
          <div className="font-bold mb-1">Browse Drills</div>
          <div className="text-xs text-white/50">Explore your library of 95 drills</div>
        </button>
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
      </div>
    </div>
  );
}
