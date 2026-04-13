import { useMemo } from "react";
import { motion as Motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Layers,
  Link2,
  MessageSquareText,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { DRILLS, CATEGORIES } from "../data/drills";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { heroPanelMotion, softCardHover, softTap, staggerContainer, staggerItem } from "../utils/motion";
import { writeSessionNavIntent } from "../utils/sessionNavIntent";

const STAT_ACCENTS = {
  accent: "bg-accent/10 text-accent",
  electric: "bg-electric/10 text-electric",
  orange: "bg-orange/10 text-orange",
  "electric-purple": "bg-electric-purple/10 text-electric-purple",
};

const byUpcomingDate = (a, b) => (a.sessionDate || "9999-12-31") > (b.sessionDate || "9999-12-31") ? 1 : -1;
const byRecentDate = (a, b) => (a.sessionDate || "") > (b.sessionDate || "") ? -1 : 1;

const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : "No date set";

function attendedSession(session, playerId) {
  if (!Array.isArray(session.attendance) || session.attendance.length === 0) return true;
  return session.attendance.includes(playerId);
}

function buildKeeperInsights({ currentPlayer, sessions, keeperNotes, allDrills }) {
  if (!currentPlayer) {
    return {
      assigned: [],
      upcoming: [],
      completed: [],
      attended: [],
      reflections: [],
      needsReflection: [],
      topFocus: [],
      recent: [],
      attendanceRate: 0,
      nextSession: null,
      lastCompleted: null,
    };
  }

  const drillMap = new Map(allDrills.map((drill) => [drill.id, drill]));
  const categoryMap = new Map(CATEGORIES.map((cat) => [cat.key, cat]));
  const assigned = sessions.filter((s) => s.playerIds?.includes(currentPlayer.id));
  const upcoming = assigned
    .filter((s) => s.status === "planned" || !s.status)
    .sort(byUpcomingDate);
  const completed = assigned
    .filter((s) => s.status === "completed")
    .sort(byRecentDate);
  const attended = completed.filter((s) => attendedSession(s, currentPlayer.id));
  const reflections = keeperNotes
    .filter((note) => note.playerId === currentPlayer.id)
    .sort((a, b) => (a.updatedAt || a.createdAt || "") > (b.updatedAt || b.createdAt || "") ? -1 : 1);
  const reflectedSessionIds = new Set(reflections.map((note) => note.sessionId));
  const needsReflection = attended
    .filter((session) => !reflectedSessionIds.has(session.id))
    .slice(0, 3);
  const focusMap = new Map();

  attended.forEach((session) => {
    session.blocks?.forEach((block) => {
      const drill = drillMap.get(block.drillId);
      if (!drill) return;
      const previous = focusMap.get(drill.cat) ?? { key: drill.cat, minutes: 0, blocks: 0 };
      focusMap.set(drill.cat, {
        ...previous,
        minutes: previous.minutes + Number(block.actualDur ?? block.dur ?? 0),
        blocks: previous.blocks + 1,
      });
    });
  });

  const topFocus = [...focusMap.values()]
    .map((item) => ({
      ...item,
      label: categoryMap.get(item.key)?.label ?? item.key,
      color: categoryMap.get(item.key)?.color ?? "#00e87a",
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3);
  const recent = [...assigned].sort(byRecentDate);

  return {
    assigned: recent,
    upcoming,
    completed,
    attended,
    reflections,
    needsReflection,
    topFocus,
    recent: recent.slice(0, 5),
    attendanceRate: completed.length ? Math.round((attended.length / completed.length) * 100) : 0,
    nextSession: upcoming[0] ?? null,
    lastCompleted: completed[0] ?? null,
  };
}

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
  const { sessions: savedSessions, players, customDrills, currentPlayer, keeperNotes } = useData();
  const allDrills = useMemo(() => [...DRILLS, ...customDrills], [customDrills]);
  const totalDrills = allDrills.length;
  const totalCategories = CATEGORIES.length;
  const { profile, isKeeper, canEdit } = useAuth();
  const memberName = profile?.name ?? "Coach";
  const keeperInsights = useMemo(
    () => buildKeeperInsights({ currentPlayer, sessions: savedSessions, keeperNotes, allDrills }),
    [allDrills, currentPlayer, keeperNotes, savedSessions],
  );
  const { upcoming: keeperUpcoming, completed: keeperCompleted, attendanceRate } = keeperInsights;
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

      {isKeeper && (
        <KeeperPortal
          currentPlayer={currentPlayer}
          insights={keeperInsights}
          setPage={setPage}
        />
      )}

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

function KeeperPortal({ currentPlayer, insights, setPage }) {
  if (!currentPlayer) {
    return (
      <Motion.section className="mb-6" {...heroPanelMotion}>
        <div className="card border-electric/25 bg-electric/5 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-lg border border-electric/30 bg-electric/10 flex items-center justify-center shrink-0">
                <Link2 size={19} className="text-electric" />
              </div>
              <div>
                <div className="brand-overline mb-2">Keeper profile</div>
                <h3 className="font-display text-xl font-bold">Roster link needed</h3>
                <p className="mt-1 max-w-2xl text-sm text-white/55">
                  Your account is active, but it is not linked to a roster profile yet. Once a coach links it, your assigned sessions, attendance, and reflections will appear here.
                </p>
              </div>
            </div>
            <Motion.button onClick={() => setPage("sessions")} whileTap={softTap} className="btn btn-secondary md:shrink-0">
              Check sessions <ArrowRight size={14} />
            </Motion.button>
          </div>
        </div>
      </Motion.section>
    );
  }

  const focusTotal = insights.topFocus.reduce((sum, item) => sum + item.minutes, 0);

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="brand-overline mb-2">Keeper hub</div>
          <h3 className="font-display text-xl font-bold">Personal training picture</h3>
        </div>
        <p className="max-w-xl text-xs text-white/45 sm:text-right">
          Built from your assigned sessions, attendance, and keeper reflections.
        </p>
      </div>

      <Motion.div
        className="grid grid-cols-1 gap-3 lg:grid-cols-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <KeeperProfileCard currentPlayer={currentPlayer} insights={insights} setPage={setPage} />
        <ReflectionQueueCard insights={insights} setPage={setPage} />
        <TrainingFocusCard insights={insights} focusTotal={focusTotal} />
        <RecentKeeperWorkCard insights={insights} setPage={setPage} />
      </Motion.div>
    </section>
  );
}

function KeeperProfileCard({ currentPlayer, insights, setPage }) {
  return (
    <Motion.div className="card p-5 lg:col-span-2" variants={staggerItem} whileHover={softCardHover}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-white/35">Linked roster profile</div>
          <h4 className="font-display text-2xl font-bold mt-1">{currentPlayer.name}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="tag bg-accent/10 text-accent border border-accent/20">{currentPlayer.position}</span>
            {currentPlayer.dominantFoot && (
              <span className="tag bg-bg-card2 border border-bg-border text-white/60">{currentPlayer.dominantFoot} foot</span>
            )}
          </div>
        </div>
        <Motion.button onClick={() => setPage("sessions")} whileTap={softTap} className="btn btn-secondary sm:shrink-0">
          Open sessions <ArrowRight size={14} />
        </Motion.button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KeeperSignal
          icon={Calendar}
          label="Next session"
          title={insights.nextSession?.name ?? "Nothing scheduled"}
          detail={insights.nextSession ? formatDate(insights.nextSession.sessionDate) : "Your next assigned session will appear here."}
          accent={!!insights.nextSession}
        />
        <KeeperSignal
          icon={CheckCircle2}
          label="Latest completed"
          title={insights.lastCompleted?.name ?? "No completed sessions"}
          detail={insights.lastCompleted ? formatDate(insights.lastCompleted.sessionDate) : "Completed work will build your training history."}
          accent={!!insights.lastCompleted}
        />
      </div>
    </Motion.div>
  );
}

function ReflectionQueueCard({ insights, setPage }) {
  const firstReflectionSession = insights.needsReflection[0];
  const openReflection = () => {
    writeSessionNavIntent({ tab: "past", sessionId: firstReflectionSession?.id ?? "" });
    setPage("sessions");
  };

  return (
    <Motion.div className="card p-5" variants={staggerItem} whileHover={softCardHover}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-white/35">Reflection queue</div>
          <h4 className="font-display text-xl font-bold mt-1">{insights.needsReflection.length} to review</h4>
        </div>
        <div className="h-10 w-10 rounded-lg border border-accent/20 bg-accent/10 flex items-center justify-center shrink-0">
          <MessageSquareText size={18} className="text-accent" />
        </div>
      </div>

      {insights.needsReflection.length > 0 ? (
        <div className="space-y-3">
          {insights.needsReflection.map((session) => (
            <div key={session.id} className="border-t border-bg-border pt-3 first:border-t-0 first:pt-0">
              <div className="truncate text-sm font-semibold">{session.name}</div>
              <div className="mt-0.5 text-xs text-white/40">{formatDate(session.sessionDate)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/50">
          You are caught up. Completed sessions that need your reflection will land here.
        </p>
      )}

      <Motion.button onClick={openReflection} whileTap={softTap} className="btn btn-primary mt-5 w-full justify-center">
        {firstReflectionSession ? "Open next reflection" : "Review sessions"} <ArrowRight size={14} />
      </Motion.button>
    </Motion.div>
  );
}

function TrainingFocusCard({ insights, focusTotal }) {
  return (
    <Motion.div className="card p-5" variants={staggerItem} whileHover={softCardHover}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-white/35">Training focus</div>
          <h4 className="font-display text-xl font-bold mt-1">Recent mix</h4>
        </div>
        <Target size={19} className="text-electric" />
      </div>

      {insights.topFocus.length > 0 ? (
        <div className="space-y-4">
          {insights.topFocus.map((focus) => {
            const percent = focusTotal ? Math.max(8, Math.round((focus.minutes / focusTotal) * 100)) : 0;
            return (
              <div key={focus.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-white/75">{focus.label}</span>
                  <span className="text-white/35">{focus.minutes} min</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: focus.color }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/50">
          Complete attended sessions to build your training-focus breakdown.
        </p>
      )}
    </Motion.div>
  );
}

function RecentKeeperWorkCard({ insights, setPage }) {
  return (
    <Motion.div className="card p-5 lg:col-span-2" variants={staggerItem} whileHover={softCardHover}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-white/35">Recent work</div>
          <h4 className="font-display text-xl font-bold mt-1">Your session timeline</h4>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/45">
          <TrendingUp size={15} className="text-accent" />
          {insights.reflections.length} reflection{insights.reflections.length === 1 ? "" : "s"} saved
        </div>
      </div>

      {insights.recent.length > 0 ? (
        <div className="space-y-3">
          {insights.recent.map((session) => {
            const completed = session.status === "completed";
            return (
              <div key={session.id} className="flex items-start gap-3 border-t border-bg-border pt-3 first:border-t-0 first:pt-0">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${completed ? "bg-emerald-400" : "bg-accent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{session.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/40">
                    <span>{formatDate(session.sessionDate)}</span>
                    <span>{session.totalDuration} min</span>
                    <span>{session.blocks.length} drills</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${completed ? "text-emerald-400" : "text-accent"}`}>
                  {completed ? "Done" : "Upcoming"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/50">Assigned sessions will appear here once your coach adds you to a session.</p>
      )}

      <Motion.button onClick={() => setPage("sessions")} whileTap={softTap} className="btn btn-secondary mt-5">
        View full history <ArrowRight size={14} />
      </Motion.button>
    </Motion.div>
  );
}

function KeeperSignal({ icon: Icon, label, title, detail, accent }) {
  return (
    <div className="rounded-lg bg-bg-soft/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
        <Icon size={13} className={accent ? "text-accent" : "text-white/35"} />
        {label}
      </div>
      <div className="truncate text-sm font-bold">{title}</div>
      <div className="mt-1 text-xs text-white/45">{detail}</div>
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
