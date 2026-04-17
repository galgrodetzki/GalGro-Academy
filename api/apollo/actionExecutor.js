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
