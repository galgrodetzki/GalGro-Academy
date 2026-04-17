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

async function handleDecide(request, auth) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

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

async function handleRequest(request) {
  const auth = await authorizeHeadCoach(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  if (request.method === "GET") return handleList(request, auth);
  if (request.method === "POST") return handleDecide(request, auth);
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
