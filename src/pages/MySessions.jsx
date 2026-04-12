import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useScrollLock } from "../hooks/useScrollLock";
import {
  Calendar, Clock, Trash2, Eye, Layers,
  CheckCircle2, CalendarDays, PenLine, X, Save, Users,
  FileDown, UserCheck,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import CategoryIcon from "../components/CategoryIcon";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { DRILLS, CATEGORIES } from "../data/drills";
import { modalBackdropMotion, modalPanelMotion } from "../utils/motion";

const playerById = (players, id) => players.find((p) => p.id === id);

const drillById = (drills, id) => drills.find((d) => d.id === id);
const catById = (key) => CATEGORIES.find((c) => c.key === key);

const formatDate = (iso) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
      })
    : "No date set";

export default function MySessions() {
  const { sessions: savedSessions, players, customDrills, updateSession: dbUpdate, removeSession: dbRemove } = useData();
  const { canEdit } = useAuth();
  const [viewingId, setViewingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const [toast, setToast] = useState("");
  const allDrills = useMemo(() => [...DRILLS, ...customDrills], [customDrills]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // Always derive from live data
  const viewing = viewingId ? savedSessions.find((s) => s.id === viewingId) ?? null : null;

  const upcoming = [...savedSessions]
    .filter((s) => s.status === "planned" || !s.status)
    .sort((a, b) => (a.sessionDate || "") < (b.sessionDate || "") ? -1 : 1);

  const past = [...savedSessions]
    .filter((s) => s.status === "completed")
    .sort((a, b) => (a.sessionDate || "") > (b.sessionDate || "") ? -1 : 1);

  const displayed = tab === "upcoming" ? upcoming : past;
  useScrollLock(!!(viewing || editing));

  const updateSession = async (updated) => {
    return dbUpdate(updated);
  };

  const removeSession = async (id) => {
    if (!canEdit) { showToast("Only coaches can delete sessions."); return; }
    if (!confirm("Delete this session?")) return;
    const error = await dbRemove(id);
    if (error) {
      showToast(`Could not delete session: ${error.message}`);
      return;
    }
    if (viewingId === id) setViewingId(null);
  };

  const markCompleted = async (id) => {
    if (!canEdit) { showToast("Only coaches can update sessions."); return; }
    const s = savedSessions.find((x) => x.id === id);
    if (!s) return;
    const error = await dbUpdate({ ...s, status: "completed" });
    if (error) showToast(`Could not update session: ${error.message}`);
  };

  const exportPDF = async (session, options = {}) => {
    const { exportSessionPDF } = await import("../utils/exportPDF");
    exportSessionPDF(session, { players, drills: allDrills, categories: CATEGORIES, ...options });
  };

  // Open recap editor
  const openRecap = (s) => {
    setEditing(s);
    setEditData({
      sessionNotes: s.sessionNotes || "",
      attendance: s.attendance ?? s.playerIds ?? [],
      blocks: s.blocks.map((b) => ({
        ...b,
        actualDur: b.actualDur ?? b.dur,
        actualNotes: b.actualNotes || "",
      })),
    });
  };

  const saveRecap = async () => {
    if (!canEdit) { showToast("Only coaches can save recaps."); return; }
    const error = await updateSession({
      ...editing,
      sessionNotes: editData.sessionNotes,
      blocks: editData.blocks,
      attendance: editData.attendance,
    });
    if (error) {
      showToast(`Could not save recap: ${error.message}`);
      return;
    }
    setEditing(null);
    setEditData(null);
  };

  const updateEditBlock = (blockId, patch) => {
    setEditData((d) => ({
      ...d,
      blocks: d.blocks.map((b) => b.blockId === blockId ? { ...b, ...patch } : b),
    }));
  };

  return (
    <div>
      <PageHeader
        title="My Sessions"
        subtitle={`${upcoming.length} upcoming · ${past.length} completed`}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 md:mb-6 bg-bg-card border border-bg-border rounded-xl p-1 w-full sm:w-fit">
        <TabBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          <CalendarDays size={14} /> Upcoming
          {upcoming.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === "upcoming" ? "bg-black/20 text-black" : "bg-bg-card2 text-white/50"}`}>
              {upcoming.length}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === "past"} onClick={() => setTab("past")}>
          <CheckCircle2 size={14} /> Completed
          {past.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === "past" ? "bg-black/20 text-black" : "bg-bg-card2 text-white/50"}`}>
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
              ? canEdit
                ? "Go to Session Builder, build a session, and save it as Upcoming."
                : "Upcoming sessions assigned to you will show up here."
              : "Sessions marked as Completed show up here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {displayed.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              tab={tab}
              players={players}
              drills={allDrills}
              canEdit={canEdit}
              onView={() => setViewingId(s.id)}
              onDelete={() => removeSession(s.id)}
              onMarkCompleted={() => markCompleted(s.id)}
              onRecap={() => openRecap(s)}
            />
          ))}
        </div>
      )}

      {/* Detail view modal */}
      <AnimatePresence>
        {viewing && !editing && (
        <Motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] flex items-end md:items-center justify-center md:p-4"
          onClick={() => setViewingId(null)}
          {...modalBackdropMotion}
        >
          <Motion.div
            className="card w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] overflow-y-auto p-5 md:p-8 rounded-t-2xl md:rounded-xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
            onClick={(e) => e.stopPropagation()}
            {...modalPanelMotion}
          >
            <div className="flex items-center gap-2 mb-1">
              {viewing.status === "completed"
                ? <CheckCircle2 size={16} className="text-emerald-400" />
                : <CalendarDays size={16} className="text-accent" />}
              <span className={`text-xs font-bold uppercase tracking-wider ${viewing.status === "completed" ? "text-emerald-400" : "text-accent"}`}>
                {viewing.status === "completed" ? "Completed" : "Upcoming"}
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold mb-1">{viewing.name}</h2>
            <div className="flex items-center gap-3 text-xs text-white/50 mb-4 pb-4 border-b border-bg-border">
              <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(viewing.sessionDate)}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={11} /> {viewing.totalDuration} / {viewing.target} min</span>
              <span>·</span>
              <span>{viewing.blocks.length} drills</span>
            </div>

            {/* Players attending / attendance */}
            {viewing.playerIds?.length > 0 && (
              <div className="mb-4">
                <div className="label mb-2 flex items-center gap-1.5">
                  <Users size={11} /> Players
                  {viewing.attendance && <span className="text-white/30 normal-case font-normal">· {viewing.attendance.length}/{viewing.playerIds.length} attended</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewing.playerIds.map((pid) => {
                    const p = playerById(players, pid);
                    if (!p) return null;
                    const attended = !viewing.attendance || viewing.attendance.includes(pid);
                    return (
                      <span key={pid} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-semibold ${
                        attended
                          ? "bg-accent/10 border-accent/20 text-accent"
                          : "bg-bg-card2 border-bg-border text-white/30 line-through"
                      }`}>
                        <span className="w-5 h-5 rounded-md bg-current/10 flex items-center justify-center text-[11px] font-black">{p.name.charAt(0)}</span>
                        {p.name}
                        {viewing.attendance && (attended ? <CheckCircle2 size={11} /> : <X size={11} />)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Session notes */}
            {viewing.sessionNotes && (
              <div className="card bg-bg-soft p-4 mb-4">
                <div className="label mb-1">Session notes</div>
                <p className="text-sm text-white/80 leading-relaxed">{viewing.sessionNotes}</p>
              </div>
            )}

            {/* Drill blocks */}
            <div className="space-y-2 mb-6">
              {viewing.blocks.map((b, i) => {
                const d = drillById(allDrills, b.drillId);
                const info = catById(d?.cat);
                if (!d) return null;
                const hasActual = b.actualDur !== undefined && b.actualDur !== b.dur;
                return (
                  <div key={b.blockId} className="card p-3 bg-bg-soft">
                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      <span className="bg-accent/20 text-accent rounded w-5 h-5 flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      <CategoryIcon category={d.cat} size={11} />
                      <span>{info?.label}</span>
                    </div>
                    <div className="font-semibold text-sm mt-1">{d.name}</div>

                    {/* Planned vs actual */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <div className="text-white/40">
                        <span className="font-medium">Planned:</span> {b.dur}m drill · {b.rest}m rest
                      </div>
                      {hasActual && (
                        <div className="text-accent">
                          <span className="font-medium">Actual:</span> {b.actualDur}m
                        </div>
                      )}
                    </div>

                    {b.notes && (
                      <p className="text-xs text-white/60 mt-2 italic border-t border-bg-border pt-2">
                        📋 {b.notes}
                      </p>
                    )}
                    {b.actualNotes && (
                      <p className="text-xs text-emerald-400/80 mt-1 italic">
                        ✏️ {b.actualNotes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => exportPDF(viewing)}
                className="btn btn-secondary flex-1"
                title="Dark theme PDF"
              >
                <FileDown size={14} /> Export PDF
              </button>
              <button
                onClick={() => exportPDF(viewing, { printMode: true })}
                className="btn btn-secondary flex-1"
                title="Light background — better for printing on paper"
              >
                <FileDown size={14} /> Print PDF
              </button>
              {canEdit && viewing.status === "completed" && (
                <button
                  onClick={() => { setViewingId(null); openRecap(viewing); }}
                  className="btn btn-secondary flex-1"
                >
                  <PenLine size={14} /> Edit recap
                </button>
              )}
              <button onClick={() => setViewingId(null)} className="btn btn-secondary flex-1">Close</button>
            </div>
          </Motion.div>
        </Motion.div>
        )}
      </AnimatePresence>

      {/* Recap editor modal */}
      <AnimatePresence>
        {editing && editData && (
        <Motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] flex items-end md:items-center justify-center md:p-4"
          onClick={() => setEditing(null)}
          {...modalBackdropMotion}
        >
          <Motion.div
            className="card w-full md:max-w-2xl max-h-[92vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-8 rounded-t-2xl md:rounded-xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
            onClick={(e) => e.stopPropagation()}
            {...modalPanelMotion}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-xl font-bold">Edit Recap</h2>
              <button onClick={() => setEditing(null)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/50 mb-6">
              Update what actually happened in <span className="text-white font-semibold">{editing.name}</span>.
            </p>

            {/* Attendance */}
            {editing.playerIds?.length > 0 && (
              <div className="mb-6">
                <label className="label flex items-center gap-1.5"><UserCheck size={12} /> Who actually showed up?</label>
                <div className="flex flex-wrap gap-2">
                  {editing.playerIds.map((pid) => {
                    const p = playerById(players, pid);
                    if (!p) return null;
                    const attended = editData.attendance?.includes(pid) ?? true;
                    return (
                      <button
                        key={pid}
                        onClick={() => {
                          const current = editData.attendance ?? editing.playerIds;
                          setEditData((d) => ({
                            ...d,
                            attendance: attended
                              ? current.filter((id) => id !== pid)
                              : [...current, pid],
                          }));
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                          attended
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-bg-border text-white/30 line-through"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-current/10 flex items-center justify-center text-[11px] font-black">
                          {p.name.charAt(0)}
                        </span>
                        {p.name}
                        {attended ? <CheckCircle2 size={12} /> : <X size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Overall session notes */}
            <div className="mb-6">
              <label className="label">Overall session notes</label>
              <textarea
                value={editData.sessionNotes}
                onChange={(e) => setEditData((d) => ({ ...d, sessionNotes: e.target.value }))}
                placeholder="How did the session go? Pitch conditions, energy levels, what stood out..."
                className="input min-h-[80px] resize-y text-sm"
              />
            </div>

            {/* Per-drill recap */}
            <div className="label mb-3">Drill recap</div>
            <div className="space-y-3 mb-6">
              {editData.blocks.map((b, i) => {
                const d = drillById(allDrills, b.drillId);
                if (!d) return null;
                return (
                  <div key={b.blockId} className="card p-4 bg-bg-soft">
                    <div className="flex items-center gap-2 text-[11px] text-white/50 mb-1">
                      <span className="bg-accent/20 text-accent rounded w-5 h-5 flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      <CategoryIcon category={d.cat} size={11} />
                      <span className="font-semibold text-white/80">{d.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {/* Planned (read-only) */}
                      <div>
                        <div className="label text-white/30 mb-1">Planned duration</div>
                        <div className="flex items-center gap-1 bg-bg-card border border-bg-border rounded px-3 py-2 text-sm text-white/50">
                          <Clock size={12} /> {b.dur} min
                        </div>
                      </div>
                      {/* Actual (editable) */}
                      <div>
                        <div className="label text-accent mb-1">Actual duration</div>
                        <div className="flex items-center gap-1 bg-bg-soft border border-accent/30 rounded px-3 py-1.5">
                          <Clock size={12} className="text-accent" />
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={b.actualDur}
                            onChange={(e) => updateEditBlock(b.blockId, { actualDur: Number(e.target.value) || 0 })}
                            className="w-12 bg-transparent text-accent font-semibold focus:outline-none text-sm"
                          />
                          <span className="text-white/40 text-sm">min</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="label mb-1">Notes on this drill</div>
                      <textarea
                        value={b.actualNotes}
                        onChange={(e) => updateEditBlock(b.blockId, { actualNotes: e.target.value })}
                        placeholder="What happened? Any adjustments made, observations, or focus points for next time..."
                        className="input text-xs min-h-[56px] resize-y"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={saveRecap} className="btn btn-primary flex-1">
                <Save size={14} /> Save recap
              </button>
            </div>
          </Motion.div>
        </Motion.div>
        )}
      </AnimatePresence>
      {toast && (
        <div className="fixed left-4 right-4 md:left-auto md:right-6 bottom-20 md:bottom-6 z-[45] card bg-bg-card px-4 py-3 border-accent/40 shadow-glow text-sm font-semibold text-center md:text-left">
          {toast}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${active ? "bg-accent text-black" : "text-white/50 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function SessionCard({ session: s, tab, players = [], drills = [], canEdit, onView, onDelete, onMarkCompleted, onRecap }) {
  return (
    <div className="card card-hover p-4">
      <div className="min-w-0 mb-2">
        <h3 className="font-display font-bold text-base truncate">{s.name}</h3>
        <div className="flex items-center gap-2 text-[11px] mt-1">
          <span className={`flex items-center gap-1 font-semibold ${s.status === "completed" ? "text-emerald-400" : "text-accent"}`}>
            <Calendar size={10} /> {formatDate(s.sessionDate)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/40 mt-0.5">
          <span className="flex items-center gap-1"><Clock size={10} /> {s.totalDuration} min</span>
          <span>{s.blocks.length} drills</span>
          {s.sessionNotes && <span className="text-accent/60">· has notes</span>}
        </div>
      </div>

      <div className="space-y-1 my-3 min-h-[52px]">
        {s.blocks.slice(0, 3).map((b) => {
          const d = drillById(drills, b.drillId);
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

      {/* Players attending */}
      {s.playerIds?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {s.playerIds.map((pid) => {
            const p = playerById(players, pid);
            if (!p) return null;
            return (
              <span key={pid} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-semibold">
                {p.name.charAt(0)} {p.name.split(" ")[0]}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-bg-border">
        <button onClick={onView} className="btn btn-secondary flex-1 py-1.5 text-xs">
          <Eye size={12} /> View
        </button>
        {canEdit && tab === "upcoming" && (
          <button
            onClick={onMarkCompleted}
            className="btn py-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            title="Mark as completed"
          >
            <CheckCircle2 size={12} />
          </button>
        )}
        {canEdit && tab === "past" && (
          <button
            onClick={onRecap}
            className="btn py-1.5 px-2 text-xs bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
            title="Edit recap"
          >
            <PenLine size={12} />
          </button>
        )}
        {canEdit && (
          <button
            onClick={onDelete}
            className="btn btn-ghost px-2 py-1.5 text-xs hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
