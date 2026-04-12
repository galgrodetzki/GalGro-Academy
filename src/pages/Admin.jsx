import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import PageHeader from "../components/PageHeader";
import {
  Plus, Copy, Trash2, Check, Users, Shield, Key,
  Bot, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Sparkles, BookOpen, Dumbbell, Timer, Zap,
} from "lucide-react";

const ROLES = [
  { value: "assistant", label: "Assistant Coach", desc: "Can build & edit sessions" },
  { value: "keeper",    label: "Keeper",          desc: "Can view sessions & add notes" },
  { value: "viewer",    label: "Viewer",           desc: "Read-only access" },
];
const MEMBER_ROLES = [
  { value: "assistant", label: "assistant" },
  { value: "keeper",    label: "keeper" },
  { value: "viewer",    label: "viewer" },
  { value: "revoked",   label: "revoked" },
];

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GK-${seg(4)}-${seg(4)}`;
}

const INTENSITY_COLOR = {
  Low:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  High:   "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Max:    "text-red-400 bg-red-500/10 border-red-500/20",
};

function ProposalCard({ proposal, onApprove, onReject, loading }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 border border-bg-border hover:border-accent/20 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={15} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{proposal.name}</div>
          <div className="text-xs text-white/40 mt-0.5 capitalize">{proposal.category?.replace(/-/g, " ")}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${INTENSITY_COLOR[proposal.intensity] ?? "text-white/40 bg-bg-soft border-bg-border"}`}>
            {proposal.intensity}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
        <span className="flex items-center gap-1"><Timer size={11} /> {proposal.duration} min</span>
        <span className="flex items-center gap-1"><Users size={11} /> {proposal.players}</span>
        {proposal.equipment && <span className="flex items-center gap-1"><Dumbbell size={11} /> {proposal.equipment}</span>}
      </div>

      {/* Description */}
      <p className="text-xs text-white/60 leading-relaxed mb-3 line-clamp-3">{proposal.description}</p>

      {/* Expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-accent/70 hover:text-accent flex items-center gap-1 mb-4 transition-colors"
      >
        {expanded ? <><ChevronUp size={12} /> Less details</> : <><ChevronDown size={12} /> More details</>}
      </button>

      {expanded && (
        <div className="space-y-3 mb-4 border-t border-bg-border pt-3">
          {proposal.objectives?.length > 0 && (
            <div>
              <div className="label mb-1.5">Objectives</div>
              <ul className="space-y-1">
                {proposal.objectives.map((o, i) => (
                  <li key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">·</span> {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {proposal.coaching_points?.length > 0 && (
            <div>
              <div className="label mb-1.5">Coaching Points</div>
              <ul className="space-y-1">
                {proposal.coaching_points.map((c, i) => (
                  <li key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                    <span className="text-electric mt-0.5">·</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {proposal.agent_notes && (
            <div>
              <div className="label mb-1.5">Agent Notes</div>
              <p className="text-xs text-white/40 italic">{proposal.agent_notes}</p>
            </div>
          )}
          {proposal.source_url && (
            <div>
              <div className="label mb-1">Source</div>
              <a
                href={proposal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent/70 hover:text-accent underline underline-offset-2 break-all"
              >
                {proposal.source_url}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(proposal)}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={13} /> Add to Library
        </button>
        <button
          onClick={() => onReject(proposal.id)}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400/70 hover:text-red-400 text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <XCircle size={13} /> Reject
        </button>
      </div>
    </div>
  );
}

function ReviewedCard({ proposal }) {
  const approved = proposal.status === "approved";
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-soft rounded-lg">
      {approved
        ? <CheckCircle2 size={15} className="text-accent flex-shrink-0" />
        : <XCircle size={15} className="text-red-400/60 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{proposal.name}</div>
        <div className="text-[11px] text-white/30 capitalize">{proposal.category?.replace(/-/g, " ")} · {proposal.intensity}</div>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${approved ? "text-accent" : "text-red-400/60"}`}>
        {proposal.status}
      </span>
    </div>
  );
}

export default function Admin() {
  const { user, isCoach } = useAuth();
  const { players, proposals, pendingProposalCount, approveProposal, rejectProposal, customDrills, deleteCustomDrill } = useData();
  const [invites, setInvites]   = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [role, setRole]         = useState("keeper");
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied]     = useState(null);
  const [toast, setToast]       = useState("");
  const [activeTab, setActiveTab] = useState("access"); // "access" | "inbox" | "library"

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    if (!isCoach) {
      setInvites([]);
      setProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [inv, prof] = await Promise.all([
      supabase.from("invites").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    ]);
    if (inv.data)  setInvites(inv.data);
    if (prof.data) setProfiles(prof.data);
    setLoading(false);
  }, [isCoach]);

  useEffect(() => { load(); }, [load]);

  const createInvite = async () => {
    if (!isCoach || !user) { showToast("Only the head coach can create invites."); return; }
    const code = makeCode();
    const { data, error } = await supabase
      .from("invites")
      .insert({ code, role, created_by: user.id })
      .select()
      .single();
    if (error) {
      showToast(`Could not create invite: ${error.message}`);
      return;
    }
    if (!error && data) {
      setInvites((prev) => [data, ...prev]);
      copyCode(data.code);
      showToast("Invite created & copied!");
    }
  };

  const deleteInvite = async (id) => {
    if (!isCoach) { showToast("Only the head coach can delete invites."); return; }
    const { error } = await supabase.from("invites").delete().eq("id", id);
    if (error) {
      showToast(`Could not delete invite: ${error.message}`);
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const updateRole = async (profileId, newRole) => {
    if (!isCoach) { showToast("Only the head coach can update roles."); return; }
    if (profileId === user.id) { showToast("You cannot change your own role."); return; }
    const member = profiles.find((p) => p.id === profileId);
    if (!member || member.role === newRole) return;
    if (newRole === "revoked" && !confirm(`Revoke access for ${member.name}? They will be blocked from the portal, but their history stays in the academy records.`)) {
      return;
    }
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
    if (error) {
      showToast(`Could not update role: ${error.message}`);
      return;
    }
    setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, role: newRole } : p));
    showToast(newRole === "revoked" ? "Access revoked" : "Role updated");
  };

  const handleApprove = async (proposal) => {
    setActionLoading(true);
    const err = await approveProposal(proposal);
    if (err) showToast("Error: " + err.message);
    else showToast(`"${proposal.name}" added to drill library!`);
    setActionLoading(false);
  };

  const handleReject = async (id) => {
    setActionLoading(true);
    const err = await rejectProposal(id);
    if (err) showToast("Error: " + err.message);
    else showToast("Proposal rejected.");
    setActionLoading(false);
  };

  const handleDeleteDrill = async (id, name) => {
    setActionLoading(true);
    const err = await deleteCustomDrill(id);
    if (err) showToast("Error: " + err.message);
    else showToast(`"${name}" removed from library.`);
    setActionLoading(false);
  };

  const ROLE_COLORS = {
    head_coach: "text-accent border-accent/30 bg-accent/10",
    assistant:  "text-electric border-electric/30 bg-electric/10",
    keeper:     "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    viewer:     "text-white/50 border-bg-border bg-bg-card2",
    revoked:    "text-red-300 border-red-500/30 bg-red-500/10",
  };
  const linkedPlayerForProfile = (profileId) =>
    players.find((player) => player.profileId === profileId);

  const pendingProposals  = proposals.filter((p) => p.status === "pending");
  const reviewedProposals = proposals.filter((p) => p.status !== "pending");

  const tabs = [
    { id: "access",  label: "Access",       icon: Key },
    { id: "inbox",   label: "Agent Inbox",  icon: Bot,      badge: pendingProposalCount },
    { id: "library", label: "Custom Drills",icon: BookOpen, badge: customDrills.length || null },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Admin" subtitle="Manage access, agent proposals, and your drill library" />

      {/* Tab bar */}
      <div className="flex gap-1 bg-bg-soft border border-bg-border rounded-xl p-1 mb-6">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors relative ${
              activeTab === id ? "bg-accent text-black" : "text-white/50 hover:text-white"
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{id === "access" ? "Access" : id === "inbox" ? "Inbox" : "Drills"}</span>
            {badge > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                activeTab === id ? "bg-black/30 text-black" : "bg-accent text-black"
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ACCESS TAB ── */}
      {activeTab === "access" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invite generator */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} className="text-accent" />
              <h2 className="font-display font-bold">Create Invite</h2>
            </div>

            <div className="space-y-3 mb-4">
              {ROLES.map((r) => (
                <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  role === r.value ? "border-accent/40 bg-accent/5" : "border-bg-border hover:border-bg-card2"
                }`}>
                  <input
                    type="radio" name="role" value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-0.5 accent-[#00e87a]"
                  />
                  <div>
                    <div className="text-sm font-semibold">{r.label}</div>
                    <div className="text-xs text-white/40">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <button onClick={createInvite} className="btn btn-primary w-full justify-center">
              <Plus size={14} /> Generate & copy invite code
            </button>

            {invites.filter((i) => !i.used).length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="label">Active codes</div>
                {invites.filter((i) => !i.used).map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 bg-bg-soft rounded-lg px-3 py-2">
                    <code className="flex-1 text-sm font-mono text-accent tracking-widest">{inv.code}</code>
                    <span className="text-[10px] text-white/40 capitalize">{inv.role.replace("_", " ")}</span>
                    <button onClick={() => copyCode(inv.code)} className="text-white/40 hover:text-accent transition-colors p-1">
                      {copied === inv.code ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                    </button>
                    <button onClick={() => deleteInvite(inv.id)} className="text-white/40 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-electric" />
              <h2 className="font-display font-bold">Members ({profiles.length})</h2>
            </div>
            <div className="space-y-2">
              {profiles.map((p) => {
                const linkedPlayer = linkedPlayerForProfile(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-bg-soft rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-sm font-black text-accent flex-shrink-0">
                      {p.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                        <span>{p.id === user.id ? "You" : "Member"}</span>
                        {p.role === "keeper" && (
                          <>
                            <span>·</span>
                            {linkedPlayer ? (
                              <span className="text-accent/75 truncate">Linked to {linkedPlayer.name}</span>
                            ) : (
                              <span className="text-yellow-400/75">Not linked to roster</span>
                            )}
                          </>
                        )}
                        {p.role === "revoked" && (
                          <>
                            <span>·</span>
                            <span className="text-red-300/80">No portal access</span>
                          </>
                        )}
                      </div>
                    </div>
                    {p.id === user.id ? (
                      <span className={`tag border text-[10px] ${ROLE_COLORS[p.role]}`}>
                        {p.role.replace("_", " ")}
                      </span>
                    ) : (
                      <select
                        value={p.role}
                        onChange={(e) => updateRole(p.id, e.target.value)}
                        className="bg-bg-card border border-bg-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-accent"
                      >
                        {MEMBER_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            {invites.filter((i) => i.used).length > 0 && (
              <div className="mt-4 pt-4 border-t border-bg-border">
                <div className="label mb-2">Used invites ({invites.filter((i) => i.used).length})</div>
                <div className="space-y-1">
                  {invites.filter((i) => i.used).map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2 text-xs text-white/30">
                      <code className="font-mono">{inv.code}</code>
                      <span>·</span>
                      <span className="capitalize">{inv.role.replace("_", " ")}</span>
                      <span className="ml-auto text-emerald-400/60">used</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AGENT INBOX TAB ── */}
      {activeTab === "inbox" && (
        <div>
          {/* Info banner */}
          <div className="card p-4 mb-5 border-electric/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles size={15} className="text-electric" />
            </div>
            <div>
              <div className="text-sm font-bold mb-0.5">Drill Scout Agent</div>
              <p className="text-xs text-white/50 leading-relaxed">
                Your AI Drill Scout researches new goalkeeper drills weekly and proposes them here.
                Review each proposal and approve to add it to your library, or reject it.
                Agents never modify your library without your approval.
              </p>
            </div>
          </div>

          {pendingProposals.length === 0 && reviewedProposals.length === 0 && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Bot size={36} className="text-white/20 mb-3" />
              <div className="font-bold text-white/40 mb-1">No proposals yet</div>
              <p className="text-xs text-white/25 max-w-xs">
                The Drill Scout agent will propose new drills here once it runs.
                Check back after the next scheduled run.
              </p>
            </div>
          )}

          {pendingProposals.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-yellow-400" />
                <h3 className="font-bold text-sm">Pending Review ({pendingProposals.length})</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingProposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    loading={actionLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {reviewedProposals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-white/30" />
                <h3 className="font-bold text-sm text-white/50">Reviewed ({reviewedProposals.length})</h3>
              </div>
              <div className="space-y-2">
                {reviewedProposals.map((p) => (
                  <ReviewedCard key={p.id} proposal={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CUSTOM DRILLS LIBRARY TAB ── */}
      {activeTab === "library" && (
        <div>
          <div className="card p-4 mb-5 border-accent/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <BookOpen size={15} className="text-accent" />
            </div>
            <div>
              <div className="text-sm font-bold mb-0.5">Custom Drill Library</div>
              <p className="text-xs text-white/50 leading-relaxed">
                Drills approved from agent proposals. These appear in your main drill library
                alongside the built-in drills and can be used in session building.
              </p>
            </div>
          </div>

          {customDrills.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <BookOpen size={36} className="text-white/20 mb-3" />
              <div className="font-bold text-white/40 mb-1">No custom drills yet</div>
              <p className="text-xs text-white/25 max-w-xs">
                Approve proposals from the Agent Inbox to add drills here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customDrills.map((drill) => (
                <div key={drill.id} className="card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap size={14} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold">{drill.name}</span>
                      <span className="text-[10px] text-white/30 bg-bg-soft px-2 py-0.5 rounded-full capitalize">
                        {drill.cat?.replace(/-/g, " ")}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${INTENSITY_COLOR[drill.int] ?? ""}`}>
                        {drill.int}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 line-clamp-2">{drill.desc}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/30">
                      <span className="flex items-center gap-1"><Timer size={10} /> {drill.dur} min</span>
                      {drill.reps && <span className="flex items-center gap-1"><Users size={10} /> {drill.reps}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDrill(drill.id, drill.name)}
                    className="text-white/25 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed left-4 right-4 md:left-auto md:right-6 bottom-20 md:bottom-6 z-[45] card bg-bg-card px-4 py-3 border-accent/40 shadow-glow text-sm font-semibold text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
