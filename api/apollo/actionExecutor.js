import { SUPABASE_ANON_KEY, makeSupabaseClient } from "../_shared/auth.js";

// Apollo 13G — Action Executor
//
// Central dispatcher that turns agent findings into real side effects.
// Every action passes through here so we have exactly one place where Apollo
// can do something to the portal.
//
// ───────────────────────────────────────────────────────────────────────────
// Autonomy tiers (enforced here, not by callers)
// ───────────────────────────────────────────────────────────────────────────
//   observe            — handler runs automatically during a heartbeat.
//                        Read-only or reversible housekeeping only.
//   recommend          — creates an approval row. On Gal's approve → runs.
//                        Safe, non-destructive but worth a conscious "yes".
//   approval_required  — creates an approval row. On Gal's approve → runs.
//                        Destructive or sensitive (access revocation, role
//                        changes, data deletes).
//   forbidden          — never runs. Even if an agent asked. Hard floor.
//
// The tier lives on the *action definition*, not on the caller. A finding can
// only pick an action that already exists; it cannot elevate its own tier.
//
// ───────────────────────────────────────────────────────────────────────────
// Registry
// ───────────────────────────────────────────────────────────────────────────
// Each action is { key, label, tier, category, handler(payload, ctx) }.
// handler returns { ok: boolean, result?: object, error?: string }.
// Handlers MUST be idempotent where possible and MUST NOT throw — catch
// internally and return { ok: false, error }.

const FORBIDDEN_CATEGORIES = new Set([
  "secret_exposure",
  "destructive_test",
  "third_party_attack",
  "credential_dump",
  "auth_bypass",
]);

const ACTION_REGISTRY = new Map();

export function registerAction(definition) {
  if (!definition?.key) throw new Error("Action definition needs a key");
  if (!["observe", "recommend", "approval_required", "forbidden"].includes(definition.tier)) {
    throw new Error(`Action ${definition.key} has unknown tier ${definition.tier}`);
  }
  if (FORBIDDEN_CATEGORIES.has(definition.category)) {
    // Refuse at registration time — we never want a forbidden category
    // handler to exist even by accident.
    throw new Error(`Action ${definition.key} category ${definition.category} is forbidden`);
  }
  ACTION_REGISTRY.set(definition.key, definition);
}

export function getAction(key) {
  return ACTION_REGISTRY.get(key) ?? null;
}

export function listActions() {
  // Strip handler — callers only need metadata (key, label, tier, category).
  return Array.from(ACTION_REGISTRY.values()).map((action) => {
    const { handler: _handler, ...rest } = action;
    void _handler;
    return rest;
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Built-in actions (always-registered baseline for 13G)
// ───────────────────────────────────────────────────────────────────────────
// These are the three safe primitives every agent can use to mark findings.
// 13H will register agent-specific actions on top of these.

registerAction({
  key: "finding.resolve",
  label: "Mark finding as resolved",
  tier: "observe",
  category: "housekeeping",
  async handler(payload, ctx) {
    const { findingId } = payload ?? {};
    if (!findingId) return { ok: false, error: "finding.resolve needs findingId" };
    const { error } = await ctx.supabase
      .from("apollo_findings")
      .update({ status: "resolved" })
      .eq("id", findingId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { findingId, status: "resolved" } };
  },
});

registerAction({
  key: "finding.defer",
  label: "Defer finding for later review",
  tier: "observe",
  category: "housekeeping",
  async handler(payload, ctx) {
    const { findingId } = payload ?? {};
    if (!findingId) return { ok: false, error: "finding.defer needs findingId" };
    const { error } = await ctx.supabase
      .from("apollo_findings")
      .update({ status: "deferred" })
      .eq("id", findingId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { findingId, status: "deferred" } };
  },
});

registerAction({
  key: "finding.accept",
  label: "Accept finding and close it",
  tier: "observe",
  category: "housekeeping",
  async handler(payload, ctx) {
    const { findingId } = payload ?? {};
    if (!findingId) return { ok: false, error: "finding.accept needs findingId" };
    const { error } = await ctx.supabase
      .from("apollo_findings")
      .update({ status: "accepted" })
      .eq("id", findingId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { findingId, status: "accepted" } };
  },
});

// ───────────────────────────────────────────────────────────────────────────
// 13H — Department actions
// ───────────────────────────────────────────────────────────────────────────

// Security · revoke a profile whose access has expired.
//   Tier: approval_required. Destructive in the sense that it flips a user's
//   role label — RLS already blocks them via access_expires_on, but the role
//   flip makes the state consistent and visible in Admin → Access.
//
// 13J-3: before flipping we snapshot the current role into the result under
// `previousRole`. This is what the Undo button reads to queue an
// `access.restore` approval that reverses the change.
registerAction({
  key: "access.revoke",
  label: "Revoke profile access (set role = revoked)",
  tier: "approval_required",
  category: "access_control",
  async handler(payload, ctx) {
    const { profileId } = payload ?? {};
    if (!profileId) return { ok: false, error: "access.revoke needs profileId" };

    // Snapshot the prior role so Undo has something to restore. Use maybeSingle
    // so a missing profile doesn't throw — we'll handle it as an error below.
    const { data: before, error: readError } = await ctx.supabase
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .maybeSingle();
    if (readError) return { ok: false, error: `Could not read current role: ${readError.message}` };
    if (!before) return { ok: false, error: `Profile ${profileId} not found` };

    const previousRole = before.role ?? null;
    // If already revoked, treat as idempotent success but carry the "previous"
    // over unchanged so Undo still points somewhere sensible (no-op restore).
    if (previousRole === "revoked") {
      return { ok: true, result: { profileId, role: "revoked", previousRole, skipped: "already_revoked" } };
    }

    const { error } = await ctx.supabase
      .from("profiles")
      .update({ role: "revoked" })
      .eq("id", profileId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { profileId, role: "revoked", previousRole } };
  },
});

// Security · restore a profile's role after a revoke.
//   Tier: approval_required. Reverses an access.revoke by setting role back to
//   its pre-revoke value. Queued via the Undo button in the Approval Inbox,
//   which pulls `previousRole` + `profileId` from the source revoke's
//   execution_result. Head coach still has to approve the restore — the undo
//   button does NOT auto-execute.
registerAction({
  key: "access.restore",
  label: "Restore profile access (reverse revoke)",
  tier: "approval_required",
  category: "access_control",
  async handler(payload, ctx) {
    const { profileId, targetRole } = payload ?? {};
    if (!profileId) return { ok: false, error: "access.restore needs profileId" };
    if (!targetRole || typeof targetRole !== "string") {
      return { ok: false, error: "access.restore needs targetRole" };
    }
    // Refuse to "restore" into revoked — that's not a restore, that's a revoke.
    if (targetRole === "revoked") {
      return { ok: false, error: "access.restore targetRole cannot be 'revoked'" };
    }

    const { data: before, error: readError } = await ctx.supabase
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .maybeSingle();
    if (readError) return { ok: false, error: `Could not read current role: ${readError.message}` };
    if (!before) return { ok: false, error: `Profile ${profileId} not found` };

    const previousRole = before.role ?? null;
    if (previousRole === targetRole) {
      return { ok: true, result: { profileId, role: targetRole, previousRole, skipped: "already_target" } };
    }

    const { error } = await ctx.supabase
      .from("profiles")
      .update({ role: targetRole })
      .eq("id", profileId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { profileId, role: targetRole, previousRole } };
  },
});

// Cyber · probe RLS on sensitive tables using a fresh anon client.
//   Tier: observe. Read-only from an unauthenticated client — same posture as
//   a logged-out attacker. The handler escalates/resolves the source finding
//   based on what it finds:
//     - Any table returns rows  → severity: critical, finding left open
//     - Any table returns 0 rows without error → severity: medium ("open but
//       empty" — RLS isn't blocking, future inserts would be public)
//     - All tables blocked by RLS → auto-resolve to keep the audit clean
//   The original Cyber finding supplies the finding ID via payload.
registerAction({
  key: "cyber.rls_audit",
  label: "Probe RLS on sensitive tables (anon client)",
  tier: "observe",
  category: "housekeeping",
  async handler(payload, ctx) {
    const { findingId, tables } = payload ?? {};
    if (!findingId) return { ok: false, error: "cyber.rls_audit needs findingId" };

    const targets = Array.isArray(tables) && tables.length > 0
      ? tables
      : ["profiles", "players", "sessions", "agent_proposals"];

    // Fresh anon client: no auth header, no session. Simulates an attacker
    // hitting the API with only the publishable key.
    const anonClient = makeSupabaseClient(SUPABASE_ANON_KEY);

    const probes = [];
    for (const table of targets) {
      // head: true so we don't actually pull rows back — just the count.
      const { count, error } = await anonClient
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) {
        probes.push({ table, status: "blocked", reason: error.message });
      } else if ((count ?? 0) > 0) {
        probes.push({ table, status: "LEAKED", rows: count });
      } else {
        // Query succeeded with 0 rows — RLS allows SELECT to anon but the
        // table is empty today. Not a leak yet, but a latent one.
        probes.push({ table, status: "open_empty", rows: 0 });
      }
    }

    const leaked = probes.filter((p) => p.status === "LEAKED");
    const openEmpty = probes.filter((p) => p.status === "open_empty");

    if (leaked.length > 0) {
      const summary = leaked.map((l) => `${l.table} (${l.rows})`).join(", ");
      const { error } = await ctx.supabase
        .from("apollo_findings")
        .update({
          severity: "critical",
          title: `RLS LEAK: anon can read ${summary}`,
          finding: `An unauthenticated Supabase client returned rows from: ${summary}. Audit RLS policies immediately.`,
          recommendation: "Review RLS policies on the leaked tables. Consider rotating the anon key if the leak is recent.",
        })
        .eq("id", findingId);
      if (error) return { ok: false, error: `Probe ran but finding update failed: ${error.message}` };
      return { ok: true, result: { probes, leakedCount: leaked.length, status: "LEAKED" } };
    }

    if (openEmpty.length > 0) {
      const summary = openEmpty.map((o) => o.table).join(", ");
      const { error } = await ctx.supabase
        .from("apollo_findings")
        .update({
          severity: "medium",
          title: `RLS allows anon SELECT (empty) on ${summary}`,
          finding: `Anonymous client can SELECT from ${summary} but those tables are currently empty. Any rows added later would be readable by anyone with the anon key.`,
          recommendation: "Tighten RLS to deny anonymous SELECT on these tables before inserting rows.",
        })
        .eq("id", findingId);
      if (error) return { ok: false, error: `Probe ran but finding update failed: ${error.message}` };
      return { ok: true, result: { probes, openEmptyCount: openEmpty.length, status: "open_empty" } };
    }

    // All tables properly block anon. Auto-resolve so the audit trail stays
    // clean on repeat runs — only real regressions surface as open findings.
    const { error } = await ctx.supabase
      .from("apollo_findings")
      .update({
        status: "resolved",
        severity: "info",
        finding: `Anonymous client was blocked on all ${probes.length} probed tables: ${probes.map((p) => p.table).join(", ")}.`,
      })
      .eq("id", findingId);
    if (error) return { ok: false, error: `Probe ran but finding update failed: ${error.message}` };
    return { ok: true, result: { probes, leakedCount: 0, status: "clean" } };
  },
});

// QA · retire a drill proposal that has sat pending too long.
//   Tier: recommend. Reversible (Gal can re-propose manually), but still
//   deserves a conscious "yes" before Apollo clears inbox entries.
registerAction({
  key: "proposal.retire_stale",
  label: "Retire stale drill proposal (mark rejected)",
  tier: "recommend",
  category: "housekeeping",
  async handler(payload, ctx) {
    const { proposalId } = payload ?? {};
    if (!proposalId) return { ok: false, error: "proposal.retire_stale needs proposalId" };
    // Only flip if still pending — protects against races where the head
    // coach already decided via the Agent Inbox.
    const { data, error } = await ctx.supabase
      .from("agent_proposals")
      .update({ status: "rejected" })
      .eq("id", proposalId)
      .eq("status", "pending")
      .select("id")
      .single();
    if (error) {
      // PGRST116 = no row matched (already decided). Treat as idempotent ok.
      if (error.code === "PGRST116") {
        return { ok: true, result: { proposalId, skipped: "not_pending" } };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true, result: { proposalId: data.id, status: "rejected" } };
  },
});

// Apollo Chat · promote a chat request into a durable memory entry.
//   Tier: recommend. Reversible (head coach can delete memory rows), but
//   still worth a conscious "yes" — memory influences future Apollo replies.
//   Payload: { title, body, memoryType?, sensitivity?, metadata? }
//
// 13L: this is the first action queued from chat (not from a department
// agent). It goes through the same registry + approvals gate, so the
// entry path is identical to agent-proposed work.
registerAction({
  key: "memory.create",
  label: "Save to Apollo memory",
  tier: "recommend",
  category: "housekeeping",
  async handler(payload, ctx) {
    const title = String(payload?.title ?? "").trim();
    const body = String(payload?.body ?? "").trim();
    if (!title) return { ok: false, error: "memory.create needs title" };
    if (!body) return { ok: false, error: "memory.create needs body" };

    const memoryType = String(payload?.memoryType ?? "project").trim() || "project";
    const sensitivity = String(payload?.sensitivity ?? "internal").trim() || "internal";

    // Deterministic-ish memory_key: slug of title + yyyy-mm-dd so the same
    // title on different days coexists. Uniqueness isn't enforced by the DB
    // schema, but keeping keys stable makes future reference/dedupe easier.
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
    const today = new Date().toISOString().slice(0, 10);
    const memoryKey = `chat-${slug || "note"}-${today}`;

    const createdBy = ctx?.actor?.id ?? null;
    const insert = {
      memory_key: memoryKey,
      memory_type: memoryType,
      title: title.slice(0, 200),
      body: body.slice(0, 4000),
      sensitivity,
      metadata: {
        ...(payload?.metadata ?? {}),
        source: "apollo_chat",
      },
      created_by: createdBy,
      updated_by: createdBy,
    };

    const { data, error } = await ctx.supabase
      .from("apollo_memory")
      .insert(insert)
      .select("id,memory_key")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { memoryId: data.id, memoryKey: data.memory_key, title: insert.title } };
  },
});

// Drill Scout · queue a new drill proposal.
//   Tier: observe. The agent_proposals row starts as "pending", which means
//   Gal still has to approve it in the Agent Inbox before it enters the
//   custom drill library. This action is the unified write path replacing
//   DrillScout's old inline insert.
registerAction({
  key: "proposal.create",
  label: "Queue drill proposal for review",
  tier: "observe",
  category: "housekeeping",
  async handler(payload, ctx) {
    const { drill } = payload ?? {};
    if (!drill?.name) return { ok: false, error: "proposal.create needs drill.name" };

    // Idempotent: skip if a proposal with this name already exists in any state.
    const { data: existing } = await ctx.supabase
      .from("agent_proposals")
      .select("id,status")
      .eq("name", drill.name)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: true, result: { proposalId: existing[0].id, skipped: "name_exists" } };
    }

    const { data, error } = await ctx.supabase
      .from("agent_proposals")
      .insert({
        agent: "drill-scout",
        status: "pending",
        name: drill.name,
        category: drill.category,
        duration: drill.duration,
        intensity: drill.intensity,
        players: drill.players,
        equipment: drill.equipment ?? null,
        description: drill.description,
        objectives: drill.objectives,
        coaching_points: drill.coaching_points,
        video_url: drill.video_url,
        agent_notes: drill.agent_notes ?? null,
        source_url: null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { proposalId: data.id, name: drill.name } };
  },
});

// ───────────────────────────────────────────────────────────────────────────
// Dispatch
// ───────────────────────────────────────────────────────────────────────────

export async function executeAction({ actionKey, payload, ctx }) {
  const action = getAction(actionKey);
  if (!action) {
    return { ok: false, error: `Unknown action: ${actionKey}` };
  }
  if (action.tier === "forbidden") {
    return { ok: false, error: `Action ${actionKey} is forbidden and cannot execute` };
  }
  if (!ctx?.supabase) {
    return { ok: false, error: "Executor requires a supabase client in ctx" };
  }
  try {
    const result = await action.handler(payload ?? {}, ctx);
    if (!result || typeof result.ok !== "boolean") {
      return { ok: false, error: `Action ${actionKey} returned invalid shape` };
    }
    return result;
  } catch (error) {
    // Handlers are supposed to never throw, but defense-in-depth.
    return { ok: false, error: `Action ${actionKey} threw: ${error?.message ?? "unknown"}` };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Tier resolution helper for the runner
// ───────────────────────────────────────────────────────────────────────────
//
// Given an action key, returns the tier so the runner knows whether to:
//   - execute immediately (observe)
//   - create an approval row (recommend, approval_required)
//   - refuse (forbidden, unknown)

export function resolveTier(actionKey) {
  const action = getAction(actionKey);
  if (!action) return { found: false, tier: null };
  return { found: true, tier: action.tier, label: action.label };
}
