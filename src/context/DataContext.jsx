import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

// ── DB ↔ JS mappers ──────────────────────────────────────────────────────────
const toSession = (row) => ({
  id:            row.id,
  name:          row.name,
  target:        row.target,
  blocks:        row.blocks ?? [],
  status:        row.status,
  sessionDate:   row.session_date ?? null,
  totalDuration: row.total_duration,
  sessionNotes:  row.session_notes ?? "",
  playerIds:     row.player_ids ?? [],
  attendance:    row.attendance ?? [],
  createdAt:     row.created_at,
});

const fromSession = (s) => ({
  id:             s.id,
  name:           s.name,
  target:         s.target,
  blocks:         s.blocks ?? [],
  status:         s.status,
  session_date:   s.sessionDate ?? null,
  total_duration: s.totalDuration ?? 0,
  session_notes:  s.sessionNotes ?? "",
  player_ids:     s.playerIds ?? [],
  attendance:     s.attendance ?? [],
});

const toPlayer = (row) => ({
  id:           row.id,
  name:         row.name,
  position:     row.position,
  dominantFoot: row.dominant_foot,
  age:          row.age ?? "",
  height:       row.height ?? "",
  weight:       row.weight ?? "",
  notes:        row.notes ?? "",
  joinedAt:     row.joined_at,
});

const fromPlayer = (p) => ({
  id:           p.id,
  name:         p.name,
  position:     p.position,
  dominant_foot: p.dominantFoot,
  age:          p.age || null,
  height:       p.height || null,
  weight:       p.weight || null,
  notes:        p.notes ?? "",
});

// Maps a custom_drills row to the same shape as static DRILLS array entries
const toCustomDrill = (row) => ({
  id:        row.id,
  cat:       row.category,
  name:      row.name,
  dur:       row.duration,
  int:       row.intensity,
  desc:      row.description,
  eq:        row.equipment ? row.equipment.split(",").map((s) => s.trim()).filter(Boolean) : [],
  cp:        Array.isArray(row.coaching_points)
               ? row.coaching_points.join(" ")
               : (row.coaching_points ?? ""),
  reps:      row.players ?? "",
  custom:    true,
  sourceUrl: row.source_url ?? null,
  proposalId: row.proposal_id ?? null,
});

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, isCoach, canEdit } = useAuth();

  const [sessions,     setSessions]     = useState([]);
  const [players,      setPlayers]      = useState([]);
  const [templates,    setTemplates]    = useState([]);
  const [settings,     setSettings]     = useState({ coachName: "Coach", defaultTarget: 60 });
  const [customDrills, setCustomDrills] = useState([]);
  const [proposals,    setProposals]    = useState([]);
  const [dataLoading,  setDataLoading]  = useState(true);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setPlayers([]);
      setTemplates([]);
      setSettings({ coachName: "Coach", defaultTarget: 60 });
      setCustomDrills([]);
      setProposals([]);
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    const [sRes, pRes, tRes, settRes, cdRes, propRes] = await Promise.all([
      supabase.from("sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("players").select("*").order("joined_at", { ascending: true }),
      canEdit
        ? supabase.from("templates").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("settings").select("*").eq("user_id", user.id).single(),
      supabase.from("custom_drills").select("*").order("created_at", { ascending: false }),
      isCoach
        ? supabase.from("agent_proposals").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    if (sRes.data)    setSessions(sRes.data.map(toSession));
    if (pRes.data)    setPlayers(pRes.data.map(toPlayer));
    if (tRes.data)    setTemplates(tRes.data);
    if (settRes.data) setSettings({ coachName: settRes.data.coach_name, defaultTarget: settRes.data.default_target });
    if (cdRes.data)   setCustomDrills(cdRes.data.map(toCustomDrill));
    if (propRes.data) setProposals(propRes.data);
    setDataLoading(false);
  }, [user, isCoach, canEdit]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const requireUser = () =>
    user ? null : new Error("You need to be signed in to do that.");

  const requireEditor = () =>
    requireUser() ?? (canEdit ? null : new Error("Only coaches can change sessions, players, and templates."));

  const requireCoach = () =>
    requireUser() ?? (isCoach ? null : new Error("Only the head coach can manage this."));

  // ── Sessions CRUD ─────────────────────────────────────────────────────────
  const addSession = async (s) => {
    const denied = requireEditor();
    if (denied) return denied;
    const row = { ...fromSession(s), created_by: user.id };
    const { data, error } = await supabase.from("sessions").insert(row).select().single();
    if (!error && data) setSessions((prev) => [toSession(data), ...prev]);
    return error;
  };

  const updateSession = async (s) => {
    const denied = requireEditor();
    if (denied) return denied;
    const row = { ...fromSession(s), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("sessions").update(row).eq("id", s.id).select().single();
    if (!error && data) setSessions((prev) => prev.map((x) => x.id === s.id ? toSession(data) : x));
    return error;
  };

  const removeSession = async (id) => {
    const denied = requireEditor();
    if (denied) return denied;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (!error) setSessions((prev) => prev.filter((s) => s.id !== id));
    return error;
  };

  // ── Players CRUD ──────────────────────────────────────────────────────────
  const addPlayer = async (p) => {
    const denied = requireEditor();
    if (denied) return denied;
    const row = { ...fromPlayer(p), created_by: user.id };
    const { data, error } = await supabase.from("players").insert(row).select().single();
    if (!error && data) setPlayers((prev) => [...prev, toPlayer(data)]);
    return error;
  };

  const updatePlayer = async (p) => {
    const denied = requireEditor();
    if (denied) return denied;
    const { data, error } = await supabase.from("players").update(fromPlayer(p)).eq("id", p.id).select().single();
    if (!error && data) setPlayers((prev) => prev.map((x) => x.id === p.id ? toPlayer(data) : x));
    return error;
  };

  const removePlayer = async (id) => {
    const denied = requireEditor();
    if (denied) return denied;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (!error) setPlayers((prev) => prev.filter((p) => p.id !== id));
    return error;
  };

  // ── Templates CRUD ────────────────────────────────────────────────────────
  const addTemplate = async (t) => {
    const denied = requireEditor();
    if (denied) return denied;
    const row = { ...t, created_by: user.id };
    const { data, error } = await supabase.from("templates").insert(row).select().single();
    if (!error && data) setTemplates((prev) => [data, ...prev]);
    return error;
  };

  const removeTemplate = async (id) => {
    const denied = requireEditor();
    if (denied) return denied;
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (!error) setTemplates((prev) => prev.filter((t) => t.id !== id));
    return error;
  };

  // ── Settings ──────────────────────────────────────────────────────────────
  const saveSettings = async (newSettings) => {
    const denied = requireUser();
    if (denied) return denied;
    const row = { user_id: user.id, coach_name: newSettings.coachName, default_target: newSettings.defaultTarget };
    const { error } = await supabase.from("settings").upsert(row, { onConflict: "user_id" });
    if (!error) setSettings(newSettings);
    return error;
  };

  // ── Agent proposals ───────────────────────────────────────────────────────
  const approveProposal = async (proposal) => {
    const denied = requireCoach();
    if (denied) return denied;
    // Insert into custom_drills
    const drillRow = {
      proposal_id:     proposal.id,
      name:            proposal.name,
      category:        proposal.category,
      duration:        proposal.duration,
      intensity:       proposal.intensity,
      players:         proposal.players,
      equipment:       proposal.equipment,
      description:     proposal.description,
      objectives:      proposal.objectives,
      coaching_points: proposal.coaching_points,
      source_url:      proposal.source_url,
    };
    const { data: drillData, error: drillErr } = await supabase
      .from("custom_drills")
      .insert(drillRow)
      .select()
      .single();

    if (drillErr) return drillErr;

    // Mark proposal as approved
    const { error: proposalErr } = await supabase
      .from("agent_proposals")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq("id", proposal.id);
    if (proposalErr) {
      const { error: cleanupErr } = await supabase.from("custom_drills").delete().eq("id", drillData.id);
      if (cleanupErr) return new Error(`${proposalErr.message} Custom drill cleanup also failed: ${cleanupErr.message}`);
      return proposalErr;
    }

    setCustomDrills((prev) => [toCustomDrill(drillData), ...prev]);
    setProposals((prev) => prev.map((p) => p.id === proposal.id ? { ...p, status: "approved" } : p));
    return null;
  };

  const rejectProposal = async (id) => {
    const denied = requireCoach();
    if (denied) return denied;
    const { error } = await supabase
      .from("agent_proposals")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq("id", id);
    if (!error) setProposals((prev) => prev.map((p) => p.id === id ? { ...p, status: "rejected" } : p));
    return error;
  };

  const deleteCustomDrill = async (id) => {
    const denied = requireCoach();
    if (denied) return denied;
    const { error } = await supabase.from("custom_drills").delete().eq("id", id);
    if (!error) setCustomDrills((prev) => prev.filter((d) => d.id !== id));
    return error;
  };

  // ── localStorage migration ────────────────────────────────────────────────
  const migrateFromLocalStorage = async () => {
    const denied = requireEditor();
    if (denied) return { ok: false, error: denied.message };
    let count = 0;
    try {
      const lsSessions  = JSON.parse(localStorage.getItem("galgro-sessions")  || "[]");
      const lsPlayers   = JSON.parse(localStorage.getItem("galgro-players")   || "[]");
      const lsTemplates = JSON.parse(localStorage.getItem("galgro-templates") || "[]");

      for (const s of lsSessions) {
        const row = { ...fromSession(s), created_by: user.id };
        await supabase.from("sessions").upsert(row, { onConflict: "id", ignoreDuplicates: true });
        count++;
      }
      for (const p of lsPlayers) {
        const row = { ...fromPlayer(p), created_by: user.id };
        await supabase.from("players").upsert(row, { onConflict: "id", ignoreDuplicates: true });
        count++;
      }
      for (const t of lsTemplates) {
        await supabase.from("templates").upsert({ ...t, created_by: user.id }, { onConflict: "id", ignoreDuplicates: true });
        count++;
      }

      await loadAll();
      return { ok: true, count };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const hasLocalData = () => {
    try {
      const s = JSON.parse(localStorage.getItem("galgro-sessions") || "[]");
      const p = JSON.parse(localStorage.getItem("galgro-players")  || "[]");
      return s.length > 0 || p.length > 0;
    } catch { return false; }
  };

  const pendingProposalCount = proposals.filter((p) => p.status === "pending").length;

  return (
    <DataContext.Provider value={{
      sessions, players, templates, settings,
      customDrills, proposals, pendingProposalCount,
      dataLoading,
      addSession, updateSession, removeSession,
      addPlayer, updatePlayer, removePlayer,
      addTemplate, removeTemplate,
      saveSettings,
      approveProposal, rejectProposal, deleteCustomDrill,
      migrateFromLocalStorage, hasLocalData,
      reload: loadAll,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
