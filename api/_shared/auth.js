// Shared auth primitives for API routes (Apollo + Mentor).
//
// Before this lived here, approvals.js / chat.js / status.js / runner.js /
// generate.js each inlined their own copies of getBearerToken,
// makeSupabaseClient, accessExpired, constantTimeEqual, and authorizeHeadCoach.
// Five divergent copies of the same auth logic is how security fixes land in
// four files and regress in the fifth — consolidating here keeps a single
// source of truth.
//
// Primitives (env + client + token helpers) are exported so dual-auth callers
// (runner.js, generate.js — which accept EITHER a runner secret OR a
// head-coach session) can compose their own authorize functions without
// re-importing @supabase/supabase-js.

import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? "https://gajcrvxyenxjqewuvkgw.supabase.co";

export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Two-arg signature is the standard. Callers that previously used a
// single-arg helper were always passing ANON_KEY implicitly — pass it
// explicitly now so the key choice stays visible at the call site.
export function makeSupabaseClient(key, accessToken) {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
  };
  if (accessToken) {
    options.global = { headers: { Authorization: `Bearer ${accessToken}` } };
  }
  return createClient(SUPABASE_URL, key, options);
}

export function getBearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

export function accessExpired(profile) {
  if (!profile?.access_expires_on) return false;
  return profile.access_expires_on < new Date().toISOString().slice(0, 10);
}

// Timing-safe string compare. Used when matching a runner secret header
// against the configured env var so we don't leak length/content via timing.
export function constantTimeEqual(a, b) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a ?? "");
  const right = encoder.encode(b ?? "");
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

// Head-coach session verification.
//
// Returns the rich shape: { ok, accessToken, supabase, actor }. Callers that
// don't need the supabase client can ignore it; callers that do (chat.js,
// status.js) get it without having to rebuild it. `roleLabel` only affects
// the denial message so each endpoint can say "Apollo approvals is..." vs
// "Apollo chat is..." without ten near-duplicate copies of the function.
export async function authorizeHeadCoach(request, { roleLabel = "this endpoint" } = {}) {
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
    return { ok: false, status: 403, error: `${roleLabel} is head-coach only.` };
  }

  return {
    ok: true,
    accessToken,
    supabase,
    actor: {
      id: userData.user.id,
      name: profile.name ?? "Head Coach",
      role: profile.role,
      source: "supabase_session",
    },
  };
}
