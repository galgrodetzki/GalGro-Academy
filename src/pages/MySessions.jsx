import { useState } from "react";
import { Calendar, Clock, Trash2, Eye, Layers, CheckCircle2, CalendarDays } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { DRILLS, CATEGORIES } from "../data/drills";

const drillById = (id) => DRILLS.find((d) => d.id === id);
const catById = (key) => CATEGORIES.find((c) => c.key === key);

const formatDate = (iso) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No date set";

export default function MySessions() {
  const [savedSessions, setSavedSessions] = useLocalStorage("galgro-sessions", []);
  const [viewing, setViewing] = useState(null);
  const [tab, setTab] = useState("upcoming");

  const upcoming = savedSessions
    .filter((s) => s.status === "planned" || !s.status)
    .sort((a, b) => (a.sessionDate || "") < (b.sessionDate || "") ? -1 : 1);

  const past = savedSessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => (a.sessionDate || "") > (b.sessionDate || "") ? -1 : 1);

  const displayed = tab === "upcoming" ? upcoming : past;

  const removeSession = (id) => {
    if (!confirm("Delete this session?")) return;
    setSavedSessions(savedSessions.filter((s) => s.id !== id));
    if (viewing?.id === id) setViewing(null);
  };

  const markCompleted = (id) => {
    setSavedSessions(
      savedSessions.map((s) =>
        s.id === id ? { ...s, status: "completed" } : s
      )
    );
  };

  return (
    <div>
      <PageHeader
        title="My Sessions"
        subtitle={`${upcoming.length} upcoming · ${past.length} completed`}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg-card border border-bg-border rounded-xl p-1 w-fit">
        <TabBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          <CalendarDays size={14} /> Upcoming
          {upcoming.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === "upcoming" ? "bg-black/20 text-black" : "bg-bg-card2 text-white/50"
            }`}>
              {upcoming.length}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === "past"} onClick={() => setTab("past")}>
          <CheckCircle2 size={14} /> Completed
          {past.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tab === "past" ? "bg-black/20 text-black" : "bg-bg-card2 text-white/50"
            }`}>
              {past.length}
            </span>
          )}
        </TabBtn>
      </div>

      {displayed.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="mx-auto text-white/20 mb-4" size={48} />
          <h3 className="font-display text-lg font-bold mb-1">
            {tab === "upcoming" ? "No upcoming sessions" : "No completed sessions yet"}
          </h3>
          <p className="text-sm text-white/50">
            {tab === "upcoming"
              ? "Go to the Session Builder, build a session, and save it as Upcoming."
              : "Sessions you mark as Completed will show up here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {displayed.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              tab={tab}
              onView={() => setViewing(s)}
              onDelete={() => removeSession(s.id)}
              onMarkCompleted={() => markCompleted(s.id)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {viewing && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              {viewing.status === "completed" ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <CalendarDays size={16} className="text-accent" />
              )}
              <span className={`text-xs font-bold uppercase tracking-wider ${
                viewing.status === "completed" ? "text-emerald-400" : "text-accent"
              }`}>
                {viewing.status === "completed" ? "Completed" : "Upcoming"}
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold mb-1">{viewing.name}</h2>
            <div className="flex items-center gap-3 text-xs text-white/50 mb-6 pb-4 border-b border-bg-border">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {formatDate(viewing.sessionDate)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={11} /> {viewing.totalDuration} / {viewing.target} min
              </span>
              <span>·</span>
              <span>{viewing.blocks.length} drills</span>
            </div>

            <div className="space-y-2 mb-6">
              {viewing.blocks.map((b, i) => {
                const d = drillById(b.drillId);
                const info = catById(d?.cat);
                if (!d) return null;
                return (
                  <div key={b.blockId} className="card p-3 bg-bg-soft">
                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      <span className="bg-accent/20 text-accent rounded w-5 h-5 flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span>{info?.icon}</span>
                      <span>{info?.label}</span>
                      <span className="ml-auto text-white/40">
                        {b.dur}m drill · {b.rest}m rest
                      </span>
                    </div>
                    <div className="font-semibold text-sm mt-1">{d.name}</div>
                    {b.notes && (
                      <p className="text-xs text-white/60 mt-2 italic border-t border-bg-border pt-2">
                        {b.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setViewing(null)} className="btn btn-secondary w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        active ? "bg-accent text-black" : "text-white/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SessionCard({ session: s, tab, onView, onDelete, onMarkCompleted }) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-base truncate">{s.name}</h3>
          <div className="flex items-center gap-2 text-[11px] mt-1">
            <span className={`flex items-center gap-1 font-semibold ${
              s.status === "completed" ? "text-emerald-400" : "text-accent"
            }`}>
              <Calendar size={10} /> {formatDate(s.sessionDate)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/40 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {s.totalDuration} min
            </span>
            <span>{s.blocks.length} drills</span>
          </div>
        </div>
      </div>

      {/* Preview drills */}
      <div className="space-y-1 my-3 min-h-[52px]">
        {s.blocks.slice(0, 3).map((b) => {
          const d = drillById(b.drillId);
          if (!d) return null;
          return (
            <div key={b.blockId} className="text-xs text-white/60 truncate">
              • {d.name} <span className="text-white/30">({b.dur}m)</span>
            </div>
          );
        })}
        {s.blocks.length > 3 && (
          <div className="text-[11px] text-white/30">+{s.blocks.length - 3} more drills</div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-bg-border">
        <button onClick={onView} className="btn btn-secondary flex-1 py-1.5 text-xs">
          <Eye size={12} /> View
        </button>
        {tab === "upcoming" && (
          <button
            onClick={onMarkCompleted}
            className="btn py-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            title="Mark as completed"
          >
            <CheckCircle2 size={12} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="btn btn-ghost px-2 py-1.5 text-xs hover:text-red-400"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
