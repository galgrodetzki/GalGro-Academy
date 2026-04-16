import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useScrollLock } from "../hooks/useScrollLock";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import {
  Users, Plus, X, Save, PenLine, Trash2, Eye,
  Calendar, Cake, Ruler, Weight, StickyNote, Link2,
  CheckCircle2, Clock3, MessageSquareText, UserCheck, AlertCircle,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { modalBackdropMotion, modalPanelMotion } from "../utils/motion";

const formatDate = (iso) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : "—";

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
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
  profileId: "",
  notes: "",
};

const byNewestSession = (a, b) => (a.sessionDate || "") > (b.sessionDate || "") ? -1 : 1;
const byOldestSession = (a, b) => (a.sessionDate || "") > (b.sessionDate || "") ? 1 : -1;
const hasRecordedAttendance = (session) => Array.isArray(session.attendance) && session.attendance.length > 0;
const attendedSession = (session, playerId) => !hasRecordedAttendance(session) || session.attendance.includes(playerId);

function buildKeeperProfile(player, sessions, keeperNotes) {
  const assigned = sessions
    .filter((s) => s.playerIds?.includes(player.id))
    .sort(byNewestSession);
  const upcoming = assigned
    .filter((s) => s.status === "planned" || !s.status)
    .sort(byOldestSession);
  const completed = assigned
    .filter((s) => s.status === "completed")
    .sort(byNewestSession);
  const attendanceTracked = completed.filter((s) => Array.isArray(s.attendance) && s.attendance.length > 0);
  const attended = attendanceTracked.filter((s) => s.attendance.includes(player.id));
  const reflections = keeperNotes
    .filter((note) => note.playerId === player.id)
    .sort((a, b) => (a.updatedAt || a.createdAt || "") > (b.updatedAt || b.createdAt || "") ? -1 : 1);
  const reflectedSessionIds = new Set(reflections.map((note) => note.sessionId));
  const missingReflections = completed
    .filter((s) => attendedSession(s, player.id) && !reflectedSessionIds.has(s.id))
    .sort(byNewestSession);

  return {
    assigned,
    upcoming,
    completed,
    attended,
    attendanceTracked,
    reflections,
    missingReflections,
    attendanceRate: attendanceTracked.length
      ? Math.round((attended.length / attendanceTracked.length) * 100)
      : null,
    nextSession: upcoming[0] ?? null,
    lastCompleted: completed[0] ?? null,
  };
}

export default function Players() {
  const { players, sessions: savedSessions, keeperNotes, memberProfiles, addPlayer, updatePlayer, removePlayer } = useData();
  const { isCoach, canEdit } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PLAYER);
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState("");

  useScrollLock(!!(showForm || viewing));
  const keeperProfileByPlayerId = useMemo(
    () => new Map(players.map((player) => [player.id, buildKeeperProfile(player, savedSessions, keeperNotes)])),
    [keeperNotes, players, savedSessions],
  );
  const viewingProfile = useMemo(
    () => viewing ? keeperProfileByPlayerId.get(viewing.id) ?? buildKeeperProfile(viewing, savedSessions, keeperNotes) : null,
    [keeperNotes, keeperProfileByPlayerId, savedSessions, viewing],
  );

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const openAdd = () => {
    if (!canEdit) { showToast("Only coaches can add players."); return; }
    setForm({ ...EMPTY_PLAYER });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (player) => {
    if (!canEdit) { showToast("Only coaches can edit players."); return; }
    setForm({ ...EMPTY_PLAYER, ...player, profileId: player.profileId ?? "" });
    setEditingId(player.id);
    setShowForm(true);
  };

  const savePlayer = async () => {
    if (!canEdit) { showToast("Only coaches can save player changes."); return; }
    if (!form.name.trim()) { showToast("Player name is required"); return; }
    if (editingId) {
      const error = await updatePlayer({ ...form, id: editingId });
      if (error) { showToast(`Could not update player: ${error.message}`); return; }
      if (viewing?.id === editingId) setViewing({ ...viewing, ...form });
      showToast(`${form.name} updated`);
    } else {
      const newPlayer = { ...form, id: "p_" + Date.now(), joinedAt: new Date().toISOString() };
      const error = await addPlayer(newPlayer);
      if (error) { showToast(`Could not add player: ${error.message}`); return; }
      showToast(`${form.name} added to roster`);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const deletePlayer = async (id, name) => {
    if (!canEdit) { showToast("Only coaches can remove players."); return; }
    if (!confirm(`Remove ${name} from the roster?`)) return;
    const error = await removePlayer(id);
    if (error) { showToast(`Could not remove player: ${error.message}`); return; }
    if (viewing?.id === id) setViewing(null);
  };

  // Sessions linked to a player
  const playerSessions = (playerId) =>
    savedSessions.filter((s) => s.playerIds?.includes(playerId));
  const keeperProfiles = memberProfiles.filter((member) => member.role === "keeper");
  const linkedProfileFor = (profileId) =>
    profileId ? memberProfiles.find((member) => member.id === profileId) : null;
  const linkedPlayerForProfile = (profileId, exceptPlayerId) =>
    profileId ? players.find((player) => player.profileId === profileId && player.id !== exceptPlayerId) : null;
  const viewingLinkedProfile = viewing?.profileId ? linkedProfileFor(viewing.profileId) : null;

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle={`${players.length} goalkeeper${players.length !== 1 ? "s" : ""} in your roster`}
      >
        {canEdit && (
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={14} /> Add player
          </button>
        )}
      </PageHeader>

      {players.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No players yet"
          body="Add your goalkeepers to start tracking their sessions, attendance, and notes."
          action={canEdit ? { label: "Add your first player", onClick: openAdd } : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {players.map((p) => {
            const sessions = playerSessions(p.id);
            const completed = sessions.filter((s) => s.status === "completed").length;
            const upcoming = sessions.filter((s) => s.status === "planned" || !s.status).length;
            const profileSummary = keeperProfileByPlayerId.get(p.id) ?? buildKeeperProfile(p, savedSessions, keeperNotes);
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
                      {p.profileId && (
                        <span className="text-[11px] text-accent/70">Account linked</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <StatPill label="Age" value={p.age || "—"} />
                  <StatPill label="Sessions" value={sessions.length} />
                  <StatPill label="Next" value={upcoming} />
                  <StatPill label="Done" value={completed} accent />
                </div>

                {/* Notes preview */}
                {p.notes && (
                  <p className="text-xs text-white/50 line-clamp-2 mb-3 italic">{p.notes}</p>
                )}

                {profileSummary.missingReflections.length > 0 && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-orange/20 bg-orange/10 px-3 py-2 text-[11px] font-semibold text-orange">
                    <AlertCircle size={12} />
                    {profileSummary.missingReflections.length} reflection{profileSummary.missingReflections.length === 1 ? "" : "s"} pending
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-bg-border">
                  <button onClick={() => setViewing(p)} className="btn btn-secondary flex-1 py-1.5 text-xs">
                    <Eye size={12} /> View
                  </button>
                  {canEdit && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit player modal */}
      <AnimatePresence>
        {showForm && (
        <Motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowForm(false)}
          {...modalBackdropMotion}
        >
          <Motion.div
            className="card w-full sm:max-w-lg p-5 sm:p-6 max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
            {...modalPanelMotion}
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

              {isCoach && (
                <div>
                  <label className="label flex items-center gap-1.5"><Link2 size={12} /> Keeper account</label>
                  <select
                    value={form.profileId ?? ""}
                    onChange={(e) => setForm({ ...form, profileId: e.target.value })}
                    className="input"
                  >
                    <option value="">No linked account</option>
                    {keeperProfiles.map((keeper) => {
                      const linkedPlayer = linkedPlayerForProfile(keeper.id, editingId);
                      return (
                        <option key={keeper.id} value={keeper.id} disabled={!!linkedPlayer}>
                          {keeper.name || "Unnamed keeper"}{linkedPlayer ? ` - linked to ${linkedPlayer.name}` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-white/40 mt-1.5">
                    Link the login account that should see this player's assigned sessions.
                  </p>
                  {keeperProfiles.length === 0 && (
                    <p className="text-[11px] text-electric/80 mt-1">
                      No keeper accounts yet. Create a keeper invite from Admin first.
                    </p>
                  )}
                </div>
              )}

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
          </Motion.div>
        </Motion.div>
        )}
      </AnimatePresence>

      {/* Player detail modal */}
      <AnimatePresence>
        {viewing && viewingProfile && !showForm && (
        <Motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] flex items-end md:items-center justify-center md:p-4"
          onClick={() => setViewing(null)}
          {...modalBackdropMotion}
        >
          <Motion.div
            className="card w-full md:max-w-3xl max-h-[92vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-8 rounded-t-2xl md:rounded-xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
            onClick={(e) => e.stopPropagation()}
            {...modalPanelMotion}
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
                  {viewingLinkedProfile && (
                    <span className="tag bg-electric/10 border border-electric/20 text-electric">
                      Account: {viewingLinkedProfile.name}
                    </span>
                  )}
                  {viewing.joinedAt && (
                    <span className="text-xs text-white/40">Added {formatDate(viewing.joinedAt.split("T")[0])}</span>
                  )}
                </div>
              </div>
              {canEdit && (
                <button onClick={() => { setViewing(null); openEdit(viewing); }} className="btn btn-secondary py-1.5 px-3 text-xs">
                  <PenLine size={12} /> Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
              <ProfileMetric
                label="Attendance"
                value={viewingProfile.attendanceRate === null ? "—" : `${viewingProfile.attendanceRate}%`}
                hint={viewingProfile.attendanceTracked.length ? `${viewingProfile.attended.length}/${viewingProfile.attendanceTracked.length} recorded` : "No records"}
                accent={viewingProfile.attendanceRate !== null}
              />
              <ProfileMetric label="Completed" value={viewingProfile.completed.length} hint="Sessions" />
              <ProfileMetric label="Upcoming" value={viewingProfile.upcoming.length} hint="Assigned" />
              <ProfileMetric
                label="Reflections"
                value={viewingProfile.reflections.length}
                hint={viewingProfile.missingReflections.length ? `${viewingProfile.missingReflections.length} pending` : "Up to date"}
                accent={viewingProfile.reflections.length > 0}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <ProfileSignal
                icon={Clock3}
                label="Next session"
                title={viewingProfile.nextSession?.name ?? "Nothing scheduled"}
                detail={viewingProfile.nextSession ? formatDate(viewingProfile.nextSession.sessionDate) : "Assign this keeper in the Session Builder."}
              />
              <ProfileSignal
                icon={CheckCircle2}
                label="Latest completed"
                title={viewingProfile.lastCompleted?.name ?? "No completed sessions"}
                detail={viewingProfile.lastCompleted ? formatDate(viewingProfile.lastCompleted.sessionDate) : "Complete a session to build history."}
                accent={!!viewingProfile.lastCompleted}
              />
            </div>

            <div className="rounded-lg border border-bg-border bg-bg-soft p-4 mb-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-electric/10 border border-electric/20 flex items-center justify-center shrink-0">
                    <Link2 size={16} className="text-electric" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Login account</div>
                    <div className="text-xs text-white/45 mt-0.5">
                      {viewingLinkedProfile
                        ? `${viewingLinkedProfile.name} can see this keeper's assigned sessions.`
                        : "No keeper account is linked yet."}
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => { setViewing(null); openEdit(viewing); }} className="btn btn-secondary py-1.5 px-3 text-xs md:shrink-0">
                    <Link2 size={12} /> Manage link
                  </button>
                )}
              </div>
            </div>

            {(viewing.age || viewing.height || viewing.weight) && (
              <div className="grid grid-cols-3 gap-2 mb-6">
                {viewing.age && <ProfileBodyStat icon={Cake} label="Age" value={`${viewing.age} yrs`} />}
                {viewing.height && <ProfileBodyStat icon={Ruler} label="Height" value={`${viewing.height} cm`} />}
                {viewing.weight && <ProfileBodyStat icon={Weight} label="Weight" value={`${viewing.weight} kg`} />}
              </div>
            )}

            {/* Notes */}
            {viewing.notes && (
              <div className="rounded-lg border border-bg-border bg-bg-soft p-4 mb-6">
                <div className="label mb-1 flex items-center gap-1.5"><StickyNote size={12} /> Coach notes</div>
                <p className="text-sm text-white/80 leading-relaxed">{viewing.notes}</p>
              </div>
            )}

            {viewingProfile.reflections.length > 0 && (
              <div className="rounded-lg border border-bg-border bg-bg-soft p-4 mb-6">
                <div className="label mb-3 flex items-center gap-1.5"><MessageSquareText size={12} /> Keeper reflections</div>
                <div className="space-y-3">
                  {viewingProfile.reflections.map((note) => {
                    const session = savedSessions.find((s) => s.id === note.sessionId);
                    return (
                      <div key={note.id} className="border-t border-bg-border first:border-t-0 first:pt-0 pt-3">
                        <div className="flex items-center gap-2 text-[11px] text-white/40 mb-1">
                          <span className="font-semibold text-accent">{session?.name ?? "Session"}</span>
                          <span>·</span>
                          <span>{formatDate(session?.sessionDate)}</span>
                          <span>·</span>
                          <span>Updated {formatDateTime(note.updatedAt ?? note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-white/75 leading-relaxed">{note.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewingProfile.missingReflections.length > 0 && (
              <div className="rounded-lg border border-orange/20 bg-orange/10 p-4 mb-6">
                <div className="label mb-2 flex items-center gap-1.5 text-orange">
                  <AlertCircle size={12} /> Reflection follow-up
                </div>
                <p className="mb-3 text-xs text-white/50">
                  Completed attended sessions without a keeper reflection yet.
                </p>
                <div className="space-y-2">
                  {viewingProfile.missingReflections.slice(0, 4).map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-orange/15 bg-bg-soft/70 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{session.name}</div>
                        <div className="text-[11px] text-white/40">{formatDate(session.sessionDate)}</div>
                      </div>
                      <span className="tag shrink-0 border border-orange/20 bg-orange/10 text-orange normal-case tracking-normal">
                        Missing
                      </span>
                    </div>
                  ))}
                  {viewingProfile.missingReflections.length > 4 && (
                    <div className="text-[11px] text-white/40">
                      +{viewingProfile.missingReflections.length - 4} more session{viewingProfile.missingReflections.length - 4 === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session history */}
            <div className="mb-2">
              <div className="label mb-3">Session history</div>
              <PlayerSessionList
                sessions={viewingProfile.assigned}
                playerId={viewing.id}
                keeperNotes={keeperNotes}
              />
            </div>

            <button onClick={() => setViewing(null)} className="btn btn-secondary w-full mt-4">
              Close
            </button>
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

/* ------------------------- SESSION LIST IN PLAYER DETAIL ---------------- */
function ProfileMetric({ label, value, hint, accent }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft p-3">
      <div className={`font-display text-xl font-bold ${accent ? "text-accent" : "text-white"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/35">{label}</div>
      {hint && <div className="mt-1 truncate text-[11px] text-white/40">{hint}</div>}
    </div>
  );
}

function ProfileSignal({ icon: Icon, label, title, detail, accent }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
        <Icon size={13} className={accent ? "text-accent" : "text-white/35"} />
        {label}
      </div>
      <div className="truncate text-sm font-bold">{title}</div>
      <div className="mt-1 text-xs text-white/45">{detail}</div>
    </div>
  );
}

function ProfileBodyStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft p-3 text-center">
      <Icon size={15} className="mx-auto mb-1 text-white/40" />
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/35">{label}</div>
    </div>
  );
}

function PlayerSessionList({ sessions, playerId, keeperNotes = [] }) {
  const assigned = sessions
    .filter((s) => s.playerIds?.includes(playerId))
    .sort((a, b) => (a.sessionDate || "") > (b.sessionDate || "") ? -1 : 1);

  if (assigned.length === 0) {
    return (
      <div className="rounded-lg border border-bg-border bg-bg-soft p-6 text-center text-white/40 text-sm">
        No sessions yet. Assign this player when saving a session in the Session Builder.
      </div>
    );
  }

  const upcoming = assigned.filter((s) => s.status === "planned" || !s.status);
  const completed = assigned.filter((s) => s.status === "completed");

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <StatPill label="Upcoming" value={upcoming.length} />
        <StatPill label="Completed" value={completed.length} accent />
      </div>
      {assigned.map((s) => {
        const attendanceRecorded = hasRecordedAttendance(s);
        const attended = attendedSession(s, playerId);
        const reflected = keeperNotes.some((note) => note.sessionId === s.id && note.playerId === playerId);

        return (
          <div key={s.id} className="rounded-lg border border-bg-border bg-bg-soft p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === "completed" ? "bg-emerald-400" : "bg-accent"}`} />
              <div className="font-semibold text-sm truncate flex-1">{s.name}</div>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${s.status === "completed" ? "text-emerald-400" : "text-accent"}`}>
                {s.status === "completed" ? "Done" : "Upcoming"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/40 pl-4">
              <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(s.sessionDate)}</span>
              <span>{s.totalDuration} min</span>
              <span>{s.blocks.length} drills</span>
              {s.status === "completed" && attendanceRecorded && (
                <span className={`flex items-center gap-1 ${attended ? "text-accent/80" : "text-red-300/75"}`}>
                  <UserCheck size={10} /> {attended ? "Attended" : "Absent"}
                </span>
              )}
              {s.status === "completed" && attended && (
                <span className={`flex items-center gap-1 ${reflected ? "text-accent/80" : "text-orange/80"}`}>
                  <MessageSquareText size={10} /> {reflected ? "Reflection saved" : "Reflection missing"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatPill({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft p-2 text-center">
      <div className={`font-bold text-base ${accent ? "text-emerald-400" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wide">{label}</div>
    </div>
  );
}
