// Apollo 13G — Approvals API
//
// GET  /api/apollo/approvals?status=pending|all
//   Lists approval rows joined with their parent finding context.
//
// POST /api/apollo/approvals
//   Body: { approvalId, decision: "approve" | "reject", notes?: string }
//   Head-coach only. On approve, runs the stored action via executeAction.

import { createClient } from "@supabase/supabase-js";
import { executeAction, resolveTier } from "./actionExecutor.js";

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? "https://gajcrvxyenxjqewuvkgw.supabase.co";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Authorization",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function makeSupabaseClient(key, accessToken) {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
  };
  if (accessToken) {
    options.global = { headers: { Authorization: `Bearer ${accessToken}` } };
  }
  return createClient(SUPABASE_URL, key, options);
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

function accessExpired(profile) {
  if (!profile?.access_expires_on) return false;
  return profile.access_expires_on < new Date().toISOString().slice(0, 10);
}

async function authorizeHeadCoach(request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { ok: false, status: 401, error: "Missing head-coach session." };
  }

  const supabase = makeSupabaseClient(SUPABASE_ANON_KEY, accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,role,access_expires_on")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, status: 403, error: "Could not verify portal role." };
  }

  if (profile.role !== "head_coach" || accessExpired(profile)) {
    return { ok: false, status: 403, error: "Apollo approvals are head-coach only." };
  }

  return {
    ok: true,
    actor: { id: userData.user.id, name: profile.name ?? "Head Coach" },
    accessToken,
  };
}

function getExecutionClient(accessToken) {
  // Prefer service role for execution so Apollo can act on tables the head
  // coach may not directly own (agent_proposals, profiles, etc.). Falls back
  // to the head-coach session client for read-only flips when no service
  // role is configured.
  if (SERVICE_ROLE_KEY) return makeSupabaseClient(SERVICE_ROLE_KEY);
  return makeSupabaseClient(SUPABASE_ANON_KEY, accessToken);
}

async function handleList(request, auth) {
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") ?? "pending";

  const client = makeSupabaseClient(SUPABASE_ANON_KEY, auth.accessToken);
  let query = client
    .from("apollo_approvals")
    .select(`
      id,
      finding_id,
      action_key,
      action_label,
      action_payload,
      autonomy_tier,
      risk_level,
      status,
      requested_by,
      decided_by,
      decided_at,
      decision_notes,
      execution_result,
      execution_error,
      executed_at,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: approvals, error } = await query;
  if (error) {
    return json({ error: `Could not load approvals: ${error.message}` }, 500);
  }

  // Fetch linked findings in one round trip so the UI can render context.
  const findingIds = (approvals ?? []).map((a) => a.finding_id).filter(Boolean);
  let findingsById = new Map();
  if (findingIds.length > 0) {
    const { data: findings, error: findingsError } = await client
      .from("apollo_findings")
      .select("id,agent_key,title,severity,category,finding,recommendation,status,metadata,created_at")
      .in("id", findingIds);
    if (!findingsError && findings) {
      findingsById = new Map(findings.map((f) => [f.id, f]));
    }
  }

  const enriched = (approvals ?? []).map((a) => ({
    ...a,
    finding: findingsById.get(a.finding_id) ?? null,
  }));

  return json({ approvals: enriched });
}

async function handlePost(request, auth) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // 13J-1 + 13J-3 + 13L + 13O: POST has five modes.
  //   mode = "decide" (default) — head coach approves or rejects a pending row
  //   mode = "retry"            — re-execute an approved row whose execution errored
  //   mode = "undo"              — queue an access.restore for a completed access.revoke
  //   mode = "queue"             — 13L: queue a registry action from Apollo Chat
  //   mode = "execute"           — 13O: run an observe-tier action directly (no approval row)
  const mode = body?.mode ?? "decide";
  if (mode === "retry") return handleRetry(body, auth);
  if (mode === "undo") return handleUndo(body, auth);
  if (mode === "queue") return handleQueue(body, auth);
  if (mode === "execute") return handleExecute(body, auth);
  if (mode === "decide") return handleDecide(body, auth);
  return json({ error: "Unknown mode. Use 'decide', 'retry', 'undo', 'queue', or 'execute'." }, 400);
}

async function handleDecide(body, auth) {
  const { approvalId, decision, notes = "" } = body ?? {};
  if (!approvalId || !["approve", "reject"].includes(decision)) {
    return json({ error: "Body needs { approvalId, decision: 'approve' | 'reject', notes? }" }, 400);
  }

  const client = makeSupabaseClient(SUPABASE_ANON_KEY, auth.accessToken);
  const { data: approval, error: loadError } = await client
    .from("apollo_approvals")
    .select("id,status,action_key,action_payload,finding_id,autonomy_tier")
    .eq("id", approvalId)
    .single();

  if (loadError || !approval) {
    return json({ error: "Approval not found." }, 404);
  }

  if (approval.status !== "pending") {
    return json({ error: `Approval is already ${approval.status}.` }, 409);
  }

  const timestamp = new Date().toISOString();

  if (decision === "reject") {
    const { error: rejectError } = await client
      .from("apollo_approvals")
      .update({
        status: "rejected",
        decided_by: auth.actor.id,
        decided_at: timestamp,
        decision_notes: notes,
      })
      .eq("id", approvalId);

    if (rejectError) {
      return json({ error: `Could not reject: ${rejectError.message}` }, 500);
    }
    return json({ ok: true, status: "rejected" });
  }

  // Approve → mark approved first, then try to execute.
  const { error: approveError } = await client
    .from("apollo_approvals")
    .update({
      status: "approved",
      decided_by: auth.actor.id,
      decided_at: timestamp,
      decision_notes: notes,
    })
    .eq("id", approvalId);

  if (approveError) {
    return json({ error: `Could not approve: ${approveError.message}` }, 500);
  }

  const tierInfo = resolveTier(approval.action_key);
  if (!tierInfo.found || tierInfo.tier === "forbidden") {
    await client
      .from("apollo_approvals")
      .update({ execution_error: `Action ${approval.action_key} is not executable.` })
      .eq("id", approvalId);
    return json({ ok: true, status: "approved", executed: false, error: "Action is not executable." });
  }

  const executionClient = getExecutionClient(auth.accessToken);
  const result = await executeAction({
    actionKey: approval.action_key,
    payload: approval.action_payload ?? {},
    ctx: { supabase: executionClient, actor: auth.actor },
  });

  if (result.ok) {
    await client
      .from("apollo_approvals")
      .update({
        status: "completed",
        executed_at: new Date().toISOString(),
        execution_result: result.result ?? {},
        execution_error: null,
      })
      .eq("id", approvalId);
    return json({ ok: true, status: "completed", result: result.result ?? {} });
  } else {
    await client
      .from("apollo_approvals")
      .update({ execution_error: result.error ?? "Unknown executor error" })
      .eq("id", approvalId);
    return json({ ok: true, status: "approved", executed: false, error: result.error }, 200);
  }
}

// 13J-1: Re-execute a previously-approved action whose initial execution
// failed. Only rows with status = "approved" AND execution_error IS NOT NULL
// are retryable. Success flips to "completed" and clears the error; failure
// updates execution_error and keeps the row retryable.
async function handleRetry(body, auth) {
  const { approvalId } = body ?? {};
  if (!approvalId) {
    return json({ error: "Retry needs { approvalId }." }, 400);
  }

  const client = makeSupabaseClient(SUPABASE_ANON_KEY, auth.accessToken);
  const { data: approval, error: loadError } = await client
    .from("apollo_approvals")
    .select("id,status,action_key,action_payload,execution_error")
    .eq("id", approvalId)
    .single();

  if (loadError || !approval) {
    return json({ error: "Approval not found." }, 404);
  }

  if (approval.status !== "approved") {
    return json({
      error: `Cannot retry: approval status is "${approval.status}". Only "approved" rows with an execution error can be retried.`,
    }, 409);
  }

  if (!approval.execution_error) {
    return json({ error: "Nothing to retry — previous execution did not error." }, 409);
  }

  const tierInfo = resolveTier(approval.action_key);
  if (!tierInfo.found || tierInfo.tier === "forbidden") {
    // Action was removed or demoted since the approval was created. Don't re-execute.
    return json({
      error: `Action "${approval.action_key}" is no longer executable.`,
    }, 409);
  }

  const executionClient = getExecutionClient(auth.accessToken);
  const result = await executeAction({
    actionKey: approval.action_key,
    payload: approval.action_payload ?? {},
    ctx: { supabase: executionClient, actor: auth.actor },
  });

  if (result.ok) {
    const { error: updateError } = await client
      .from("apollo_approvals")
      .update({
        status: "completed",
        executed_at: new Date().toISOString(),
        execution_result: result.result ?? {},
        execution_error: null,
      })
      .eq("id", approvalId);
    if (updateError) {
      // Execution succeeded but we couldn't mark it. Surface so the head coach
      // knows the side effect happened even if the row still looks stuck.
      return json({
        ok: true,
        status: "completed",
        result: result.result ?? {},
        warning: `Execution succeeded but row update failed: ${updateError.message}`,
      });
    }
    return json({ ok: true, status: "completed", result: result.result ?? {} });
  }

  // Still failing — update the error and leave the row retryable.
  await client
    .from("apollo_approvals")
    .update({ execution_error: result.error ?? "Unknown executor error" })
    .eq("id", approvalId);
  return json({ ok: false, status: "approved", executed: false, error: result.error }, 200);
}

// 13J-3: Queue an access.restore approval that reverses a completed
// access.revoke. This is a narrow endpoint — it ONLY creates a new pending
// access.restore row from a valid source approval. The head coach still
// explicitly approves (or rejects) the restore through the normal decide flow.
//
// Guardrails:
//   - Source must be status = "completed" AND action_key = "access.revoke"
//   - Source execution_result must contain profileId + previousRole
//   - previousRole cannot be "revoked" (would be a no-op loop)
//   - Dedup: refuse if a pending OR completed access.restore already exists
//     for the same sourceApprovalId (one undo per revoke)
async function handleUndo(body, auth) {
  const { approvalId } = body ?? {};
  if (!approvalId) {
    return json({ error: "Undo needs { approvalId }." }, 400);
  }

  const client = makeSupabaseClient(SUPABASE_ANON_KEY, auth.accessToken);
  const { data: source, error: loadError } = await client
    .from("apollo_approvals")
    .select("id,status,action_key,execution_result")
    .eq("id", approvalId)
    .single();

  if (loadError || !source) {
    return json({ error: "Source approval not found." }, 404);
  }

  if (source.action_key !== "access.revoke") {
    return json({ error: "Undo is only supported for access.revoke." }, 409);
  }
  if (source.status !== "completed") {
    return json({
      error: `Undo requires the source revoke to be completed (current: ${source.status}).`,
    }, 409);
  }

  const result = source.execution_result ?? {};
  const profileId = result.profileId;
  const previousRole = result.previousRole;
  if (!profileId || !previousRole) {
    return json({
      error: "Source revoke has no snapshot (previousRole/profileId). Undo is unavailable.",
    }, 409);
  }
  if (previousRole === "revoked") {
    return json({ error: "Previous role was already 'revoked' — nothing to restore to." }, 409);
  }

  // Dedup: one undo per revoke. Check sourceApprovalId on existing restore rows.
  const { data: existing, error: dupError } = await client
    .from("apollo_approvals")
    .select("id,status")
    .eq("action_key", "access.restore")
    .contains("action_payload", { sourceApprovalId: approvalId })
    .limit(1);

  if (!dupError && existing && existing.length > 0) {
    return json({
      error: `Undo already ${existing[0].status === "completed" ? "applied" : "queued"} for this revoke.`,
    }, 409);
  }

  const tierInfo = resolveTier("access.restore");
  if (!tierInfo.found) {
    return json({ error: "access.restore is not registered." }, 500);
  }

  const payload = {
    profileId,
    targetRole: previousRole,
    sourceApprovalId: approvalId,
  };

  const { data: inserted, error: insertError } = await client
    .from("apollo_approvals")
    .insert({
      // Undo rows are not linked to a finding — they originate from a prior
      // approval, not an agent run. finding_id is nullable on purpose.
      finding_id: null,
      action_key: "access.restore",
      action_label: tierInfo.label,
      action_payload: payload,
      autonomy_tier: tierInfo.tier,
      risk_level: "medium",
      status: "pending",
      requested_by: auth.actor.name ?? "head_coach_undo",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return json({
      error: `Could not queue restore approval: ${insertError?.message ?? "unknown"}`,
    }, 500);
  }

  return json({ ok: true, status: "pending", approvalId: inserted.id });
}

// 13L: Queue a registry action from Apollo Chat.
//
// The head coach (via chat) selects a suggested action; this endpoint is the
// single write path that turns that click into a pending apollo_approvals
// row. It mirrors what department agents do — same registry, same tier
// enforcement, same row shape. No back door.
//
// Hard rules:
//   - Action key MUST be registered.
//   - Action tier MUST be 'recommend' or 'approval_required' (observe runs
//     automatically and has no approval row; forbidden is never queued).
//   - The payload is stored verbatim; handlers validate it at execution time.
//   - riskLevel defaults by tier if not provided.
//   - Dedup: if an identical pending row exists (same actionKey + payload)
//     we return the existing row instead of creating a duplicate.
async function handleQueue(body, auth) {
  const { actionKey, payload = {}, reasoning = "" } = body ?? {};
  if (!actionKey || typeof actionKey !== "string") {
    return json({ error: "Queue needs { actionKey, payload? }." }, 400);
  }
  if (payload && typeof payload !== "object") {
    return json({ error: "payload must be an object." }, 400);
  }

  const tierInfo = resolveTier(actionKey);
  if (!tierInfo.found) {
    return json({ error: `Unknown action: ${actionKey}.` }, 400);
  }
  if (tierInfo.tier === "forbidden") {
    return json({ error: `Action ${actionKey} is forbidden.` }, 403);
  }
  if (tierInfo.tier === "observe") {
    return json({
      error: `Action ${actionKey} is observe-tier and cannot be queued for approval.`,
    }, 400);
  }
  if (!["recommend", "approval_required"].includes(tierInfo.tier)) {
    return json({ error: `Tier ${tierInfo.tier} is not queueable.` }, 400);
  }

  const client = makeSupabaseClient(SUPABASE_ANON_KEY, auth.accessToken);

  // Dedup against pending rows with the same action_key + payload. JSONB
  // equality on `contains` in both directions catches exact-match payloads
  // without being too strict.
  if (payload && Object.keys(payload).length > 0) {
    const { data: existing } = await client
      .from("apollo_approvals")
      .select("id,status")
      .eq("action_key", actionKey)
      .eq("status", "pending")
      .contains("action_payload", payload)
      .limit(1);
    if (existing && existing.length > 0) {
      return json({ ok: true, status: "pending", approvalId: existing[0].id, deduped: true });
    }
  }

  const riskDefault = tierInfo.tier === "approval_required" ? "high" : "medium";

  const { data: inserted, error: insertError } = await client
    .from("apollo_approvals")
    .insert({
      // Chat-queued rows have no source finding — they originate from a
      // head-coach chat message, not an agent run. finding_id is nullable.
      finding_id: null,
      action_key: actionKey,
      action_label: tierInfo.label,
      action_payload: payload,
      autonomy_tier: tierInfo.tier,
      risk_level: riskDefault,
      status: "pending",
      requested_by: "apollo_chat",
      decision_notes: reasoning ? String(reasoning).slice(0, 500) : "",
    })
    .select("id,action_key,action_label,autonomy_tier,risk_level,status,action_payload,created_at")
    .single();

  if (insertError || !inserted) {
    return json({
      error: `Could not queue approval: ${insertError?.message ?? "unknown"}`,
    }, 500);
  }

  return json({ ok: true, status: "pending", approvalId: inserted.id, approval: inserted });
}

// 13O: Run an observe-tier action directly, bypassing the approval queue.
//
// Observe-tier actions auto-execute from the runner already (finding lifecycle
// flips, proposal.create, cyber.rls_audit). This mode gives the UI a parallel
// path — so the head coach can click Resolve/Accept/Defer on an open finding
// and have the status flip immediately without spawning a throwaway approval
// row. No audit row is created because the action's own side effect (e.g.
// apollo_findings.status update) IS the record.
//
// Hard rules:
//   - Action key MUST be registered.
//   - Action tier MUST be 'observe'. Anything else goes through `queue`.
//   - Forbidden and unknown refuse with 4xx.
//   - Payload is passed verbatim; handlers validate their own required fields.
//   - Head coach auth is required (same as every other mode on this endpoint).
async function handleExecute(body, auth) {
  const { actionKey, payload = {} } = body ?? {};
  if (!actionKey || typeof actionKey !== "string") {
    return json({ error: "Execute needs { actionKey, payload? }." }, 400);
  }
  if (payload && typeof payload !== "object") {
    return json({ error: "payload must be an object." }, 400);
  }

  const tierInfo = resolveTier(actionKey);
  if (!tierInfo.found) {
    return json({ error: `Unknown action: ${actionKey}.` }, 400);
  }
  if (tierInfo.tier === "forbidden") {
    return json({ error: `Action ${actionKey} is forbidden.` }, 403);
  }
  if (tierInfo.tier !== "observe") {
    return json({
      error: `Action ${actionKey} is ${tierInfo.tier}-tier. Use mode='queue' to request approval.`,
    }, 400);
  }

  const executionClient = getExecutionClient(auth.accessToken);
  const result = await executeAction({
    actionKey,
    payload,
    ctx: { supabase: executionClient, actor: auth.actor },
  });

  if (!result.ok) {
    return json({ ok: false, error: result.error ?? "Unknown executor error" }, 200);
  }
  return json({ ok: true, result: result.result ?? {} });
}

async function handleRequest(request) {
  const auth = await authorizeHeadCoach(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  if (request.method === "GET") return handleList(request, auth);
  if (request.method === "POST") return handlePost(request, auth);
  return json({ error: "Method not allowed." }, 405);
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }
    try {
      return await handleRequest(request);
    } catch (error) {
      console.error("Apollo approvals failed", error);
      return json({ error: "Apollo approvals failed safely." }, 500);
    }
  },
};
