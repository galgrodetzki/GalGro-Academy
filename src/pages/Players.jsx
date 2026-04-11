import { useState } from "react";
import {
  Users, Plus, X, Save, PenLine, Trash2, Eye,
  Calendar, Clock, ChevronRight, ShieldHalf, Cake,
  Ruler, Weight, StickyNote, CheckCircle2, CalendarDays,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { DRILLS } from "../data/drills";

const drillById = (id) => DRILLS.find((d) => d.id === id);

const formatDate = (iso) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : "—";

const POSITIONS = ["GK1", "GK2", "GK3", "Academy GK", "Trial"];
const DOMINANT_FOOT = ["Right", "Left", "Both"];

const EMPTY_PLAYER = {
  name: "",
  position: "GK1",
  age: "",
  height: "",
  weight: "",
  dominantFoot: "Right",
  notes: "",
};

export default function Players() {
  const [players, setPlayers] = useLocalStorage("galgro-players", []);
  const [savedSessions, setSavedSessions] = useLocalStorage("galgro-sessions", []);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PLAYER);
  const [viewing, setViewing] = useState(null); // player detail
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const openAdd = () => {
    setForm(EMPTY_PLAYER);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (player) => {
    setForm({ ...player });
    setEditingId(player.id);
    setShowForm(true);
  };

  const savePlayer = () => {
    if (!form.name.trim()) { showToast("Player name is required"); return; }
    if (editingId) {
      setPlayers(players.map((p) => p.id === editingId ? { ...p, ...form } : p));
      if (viewing?.id === editingId) setViewing({ ...viewing, ...form });
      showToast(`${form.name} updated`);
    } else {
      const newPlayer = { ...form, id: "p_" + Date.now(), joinedAt: new Date().toISOString() };
      setPlayers([...players, newPlayer]);
      showToast(`${form.name} added to roster`);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const deletePlayer = (id, name) => {
    if (!confirm(`Remove ${name} from the roster?`)) return;
    setPlayers(players.filter((p) => p.id !== id));
    if (viewing?.id === id) setViewing(null);
  };

  // Sessions linked to a player
  const playerSessions = (playerId) =>
    savedSessions.filter((s) => s.playerIds?.includes(playerId));

  // Toggle player assignment on a session
  const toggleSessionPlayer = (sessionId, playerId) => {
    setSavedSessions(savedSessions.map((s) => {
      if (s.id !== sessionId) return s;
      const ids = s.playerIds || [];
      return {
        ...s,
        playerIds: ids.includes(playerId)
          ? ids.filter((id) => id !== playerId)
          : [...ids, playerId],
      };
    }));
  };

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle={`${players.length} goalkeeper${players.length !== 1 ? "s" : ""} in your roster`}
      >
        <button onClick={openAdd} className="btn btn-primary">
          <Plus size={14} /> Add player
        </button>
      </PageHeader>

      {players.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="mx-auto text-white/20 mb-4" size={48} />
          <h3 className="font-display text-lg font-bold mb-1">No players yet</h3>
          <p className="text-sm text-white/50 mb-4">Add your goalkeepers to start tracking their sessions.</p>
          <button onClick={openAdd} className="btn btn-primary mx-auto">
            <Plus size={14} /> Add your first player
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {players.map((p) => {
            const sessions = playerSessions(p.id);
            const completed = sessions.filter((s) => s.status === "completed").length;
            const upcoming = sessions.filter((s) => s.status === "planned" || !s.status).length;
            return (
              <div key={p.id} className="card card-hover p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="font-display font-black text-accent text-lg">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-base truncate">{p.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="tag bg-accent/10 text-accent border border-accent/20">{p.position}</span>
                      {p.dominantFoot && (
                        <span className="text-[11px] text-white/40">{p.dominantFoot} foot</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <StatPill label="Age" value={p.age || "—"} />
                  <StatPill label="Sessions" value={sessions.length} />
                  <StatPill label="Done" value={completed} accent />
                </div>

                {/* Notes preview */}
                {p.notes && (
                  <p className="text-xs text-white/50 line-clamp-2 mb-3 italic">{p.notes}</p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-bg-border">
                  <button onClick={() => setViewing(p)} className="btn btn-secondary flex-1 py-1.5 text-xs">
                    <Eye size={12} /> View
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="btn btn-ghost px-2 py-1.5 text-xs hover:text-accent"
                    title="Edit"
                  >
                    <PenLine size={12} />
                  </button>
                  <button
                    onClick={() => deletePlayer(p.id, p.name)}
                    className="btn btn-ghost px-2 py-1.5 text-xs hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit player modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold">
                {editingId ? "Edit Player" : "Add Player"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Alex Johnson"
                  className="input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="input"
                  >
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Dominant foot</label>
                  <select
                    value={form.dominantFoot}
                    onChange={(e) => setForm({ ...form, dominantFoot: e.target.value })}
                    className="input"
                  >
                    {DOMINANT_FOOT.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Age</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    placeholder="e.g. 17"
                    className="input"
                    min="8"
                    max="50"
                  />
                </div>
                <div>
                  <label className="label">Height (cm)</label>
                  <input
                    type="number"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    placeholder="e.g. 185"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    placeholder="e.g. 78"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Strengths, areas to work on, anything relevant..."
                  className="input min-h-[80px] resize-y text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={savePlayer} className="btn btn-primary flex-1">
                <Save size={14} /> {editingId ? "Save changes" : "Add player"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player detail modal */}
      {viewing && !showForm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Player header */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-bg-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <span className="font-display font-black text-accent text-3xl">
                  {viewing.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold">{viewing.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="tag bg-accent/10 text-accent border border-accent/20">{viewing.position}</span>
                  {viewing.dominantFoot && (
                    <span className="tag bg-bg-card2 border border-bg-border text-white/60">{viewing.dominantFoot} foot</span>
                  )}
                  {viewing.joinedAt && (
                    <span className="text-xs text-white/40">Added {formatDate(viewing.joinedAt.split("T")[0])}</span>
                  )}
                </div>
              </div>
              <button onClick={() => { setViewing(null); openEdit(viewing); }} className="btn btn-secondary py-1.5 px-3 text-xs">
                <PenLine size={12} /> Edit
              </button>
            </div>

            {/* Physical stats */}
            {(viewing.age || viewing.height || viewing.weight) && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {viewing.age && (
                  <div className="card bg-bg-soft p-3 text-center">
                    <Cake size={16} className="mx-auto text-white/40 mb-1" />
                    <div className="font-bold text-lg">{viewing.age}</div>
                    <div className="text-[11px] text-white/40">years old</div>
                  </div>
                )}
                {viewing.height && (
                  <div className="card bg-bg-soft p-3 text-center">
                    <Ruler size={16} className="mx-auto text-white/40 mb-1" />
                    <div className="font-bold text-lg">{viewing.height}</div>
                    <div className="text-[11px] text-white/40">cm</div>
                  </div>
                )}
                {viewing.weight && (
                  <div className="card bg-bg-soft p-3 text-center">
                    <Weight size={16} className="mx-auto text-white/40 mb-1" />
                    <div className="font-bold text-lg">{viewing.weight}</div>
                    <div className="text-[11px] text-white/40">kg</div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {viewing.notes && (
              <div className="card bg-bg-soft p-4 mb-6">
                <div className="label mb-1 flex items-center gap-1.5"><StickyNote size={12} /> Coach notes</div>
                <p className="text-sm text-white/80 leading-relaxed">{viewing.notes}</p>
              </div>
            )}

            {/* Session history */}
            <div className="mb-2">
              <div className="label mb-3">Session history</div>
              <PlayerSessionList
                sessions={savedSessions}
                playerId={viewing.id}
                onToggle={(sessionId) => toggleSessionPlayer(sessionId, viewing.id)}
              />
            </div>

            <button onClick={() => setViewing(null)} className="btn btn-secondary w-full mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card bg-bg-card px-4 py-3 border-accent/40 shadow-glow text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------- SESSION LIST IN PLAYER DETAIL ---------------- */
function PlayerSessionList({ sessions, playerId, onToggle }) {
  const [tab, setTab] = useState("assigned");

  const assigned = sessions.filter((s) => s.playerIds?.includes(playerId));
  const all = sessions;

  const displayed = tab === "assigned" ? assigned : all;

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-bg-soft rounded-lg p-1 w-fit">
        {[["assigned", `Assigned (${assigned.length})`], ["all", `All sessions (${all.length})`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tab === key ? "bg-accent text-black" : "text-white/50 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="card p-6 text-center text-white/40 text-sm">
          {tab === "assigned"
            ? "No sessions assigned yet. Switch to 'All sessions' to assign some."
            : "No saved sessions yet. Build one in Session Builder."}
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {displayed.map((s) => {
            const isAssigned = s.playerIds?.includes(playerId);
            return (
              <div key={s.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                    <span className={`flex items-center gap-1 ${s.status === "completed" ? "text-emerald-400" : "text-accent"}`}>
                      {s.status === "completed" ? <CheckCircle2 size={10} /> : <CalendarDays size={10} />}
                      {formatDate(s.sessionDate)}
                    </span>
                    <span>· {s.totalDuration} min</span>
                    <span>· {s.blocks.length} drills</span>
                  </div>
                </div>
                <button
                  onClick={() => onToggle(s.id)}
                  className={`btn py-1.5 px-3 text-xs shrink-0 transition-all ${
                    isAssigned
                      ? "bg-accent/10 text-accent border border-accent/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                      : "btn-secondary hover:border-accent/40 hover:text-accent"
                  }`}
                >
                  {isAssigned ? "Remove" : "Assign"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, accent }) {
  return (
    <div className="card bg-bg-soft p-2 text-center">
      <div className={`font-bold text-base ${accent ? "text-emerald-400" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wide">{label}</div>
    </div>
  );
}
