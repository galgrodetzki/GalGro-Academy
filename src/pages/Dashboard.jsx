import { motion as Motion } from "framer-motion";
import { BookOpen, Layers, Users, Calendar, Sparkles, CheckCircle2, UserCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { DRILLS, CATEGORIES } from "../data/drills";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { heroPanelMotion, softCardHover, softTap, staggerContainer, staggerItem } from "../utils/motion";

const STAT_ACCENTS = {
  accent: "bg-accent/10 text-accent",
  electric: "bg-electric/10 text-electric",
  orange: "bg-orange/10 text-orange",
  "electric-purple": "bg-electric-purple/10 text-electric-purple",
};

function StatCard({ icon: Icon, value, label, accent = "accent", gradient }) {
  return (
    <Motion.div className="card p-5 relative overflow-hidden" variants={staggerItem} whileHover={softCardHover}>
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: gradient }}
      />
      <div className={`w-10 h-10 rounded-lg ${STAT_ACCENTS[accent] ?? STAT_ACCENTS.accent} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <div className="text-3xl font-black tracking-tight">{value}</div>
      <div className="text-xs text-white/50 font-medium mt-0.5">{label}</div>
    </Motion.div>
  );
}

export default function Dashboard({ setPage }) {
  const { sessions: savedSessions, players, customDrills, currentPlayer } = useData();
  const totalDrills = DRILLS.length + customDrills.length;
  const totalCategories = CATEGORIES.length;
  const { profile, isKeeper, canEdit } = useAuth();
  const memberName = profile?.name ?? "Coach";
  const keeperSessions = currentPlayer
    ? savedSessions.filter((s) => s.playerIds?.includes(currentPlayer.id))
    : [];
  const keeperUpcoming = keeperSessions.filter((s) => s.status === "planned" || !s.status);
  const keeperCompleted = keeperSessions.filter((s) => s.status === "completed");
  const keeperAttended = keeperCompleted.filter((s) => {
    if (!Array.isArray(s.attendance) || s.attendance.length === 0) return true;
    return s.attendance.includes(currentPlayer.id);
  });
  const attendanceRate = keeperCompleted.length
    ? Math.round((keeperAttended.length / keeperCompleted.length) * 100)
    : 0;
  const primaryAction = canEdit
    ? { page: "builder", label: "Start Building", icon: Layers }
    : { page: "sessions", label: "View Sessions", icon: Calendar };
  const PrimaryIcon = primaryAction.icon;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${memberName}`}
        subtitle={isKeeper ? "Your goalkeeper training hub" : "Your goalkeeping academy command center"}
      />

      {/* Hero banner */}
      <Motion.div className="academy-panel p-5 md:p-6 mb-5 md:mb-6" {...heroPanelMotion}>
        <div className="relative z-10">
          <div className="brand-overline mb-3">
            <Sparkles size={14} />
            Welcome to GalGro's Academy
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold mb-2">
            {isKeeper
              ? currentPlayer
                ? "Track your keeper work"
                : "Connect your roster profile"
              : canEdit
                ? "Build your next session"
                : "Review your academy work"}
          </h2>
          <p className="text-white/60 text-sm max-w-xl mb-4">
            {isKeeper
              ? currentPlayer
                ? `${keeperUpcoming.length} upcoming sessions, ${keeperCompleted.length} completed, and ${attendanceRate}% attendance across completed work.`
                : "Ask your coach to match your account name to your roster profile so your sessions appear here."
              : canEdit
                ? `Drag-and-drop from your library of ${totalDrills} professional drills, organized across ${totalCategories} categories.`
                : `Browse ${totalDrills} goalkeeper drills and review your upcoming sessions.`}
          </p>
          <Motion.button onClick={() => setPage(primaryAction.page)} whileTap={softTap} className="btn btn-primary">
            <PrimaryIcon size={16} />
            {primaryAction.label}
          </Motion.button>
        </div>
      </Motion.div>

      {/* Stats */}
      <Motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6" variants={staggerContainer} initial="initial" animate="animate">
        {isKeeper ? (
          <>
            <StatCard
              icon={Calendar}
              value={currentPlayer ? keeperUpcoming.length : "—"}
              label="Upcoming"
              accent="accent"
              gradient="linear-gradient(90deg, #00ff87, transparent)"
            />
            <StatCard
              icon={CheckCircle2}
              value={currentPlayer ? keeperCompleted.length : "—"}
              label="Completed"
              accent="electric"
              gradient="linear-gradient(90deg, #4488ff, transparent)"
            />
            <StatCard
              icon={UserCheck}
              value={currentPlayer ? `${attendanceRate}%` : "—"}
              label="Attendance"
              accent="orange"
              gradient="linear-gradient(90deg, #ff6b35, transparent)"
            />
            <StatCard
              icon={BookOpen}
              value={totalDrills}
              label="Drills"
              accent="electric-purple"
              gradient="linear-gradient(90deg, #a855f7, transparent)"
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </Motion.div>

      {/* Quick actions grid */}
      <Motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4" variants={staggerContainer} initial="initial" animate="animate">
        <QuickActionCard
          onClick={() => setPage("library")}
          icon={BookOpen}
          iconClassName="text-accent"
          title="Browse Drills"
          detail={`Explore your library of ${totalDrills} drills`}
        />
        {canEdit ? (
          <>
            <QuickActionCard
              onClick={() => setPage("builder")}
              icon={Layers}
              iconClassName="text-electric"
              title="Build a Session"
              detail="Drag-and-drop session planner"
            />
            <QuickActionCard
              onClick={() => setPage("players")}
              icon={Users}
              iconClassName="text-orange"
              title="Manage Players"
              detail="Your goalkeeper roster"
            />
          </>
        ) : (
          <QuickActionCard
            onClick={() => setPage("sessions")}
            icon={Calendar}
            iconClassName="text-electric"
            title="My Sessions"
            detail="Review upcoming and completed sessions"
            className="sm:col-span-2"
          />
        )}
      </Motion.div>
    </div>
  );
}

function QuickActionCard({ onClick, icon: Icon, iconClassName, title, detail, className = "" }) {
  return (
    <Motion.button
      onClick={onClick}
      className={`card card-hover p-5 text-left group ${className}`}
      variants={staggerItem}
      whileHover={softCardHover}
      whileTap={softTap}
    >
      <Icon className={`${iconClassName} mb-3 transition-transform duration-200 group-hover:translate-x-0.5`} size={22} />
      <div className="font-bold mb-1 transition-colors group-hover:text-accent">{title}</div>
      <div className="text-xs text-white/50">{detail}</div>
    </Motion.button>
  );
}
