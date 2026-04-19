// Apollo 13G — client helpers for the Approval Inbox.
// Head-coach session token is required for all calls.

import { supabase } from "./supabase";

async function getAuthToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sign in as head coach to use Apollo approvals.");
  }
  return data.session.access_token;
}

export async function fetchApprovals({ status = "pending" } = {}) {
  const token = await getAuthToken();
  const response = await fetch(`/api/apollo/approvals?status=${encodeURIComponent(status)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Could not load approvals (${response.status}).`);
  }
  return payload.approvals ?? [];
}

export async function decideApproval({ approvalId, decision, notes = "" }) {
  const token = await getAuthToken();
  const response = await fetch("/api/apollo/approvals", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approvalId, decision, notes, mode: "decide" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Could not ${decision} approval (${response.status}).`);
  }
  return payload;
}

// 13J-3: Queue an access.restore approval that reverses a completed
// access.revoke. Does NOT execute the restore — just creates a new pending
// approval row. Head coach still approves it through the normal flow.
export async function undoAccessRevoke({ approvalId }) {
  const token = await getAuthToken();
  const response = await fetch("/api/apollo/approvals", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approvalId, mode: "undo" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Could not queue undo (${response.status}).`);
  }
  return payload;
}

// 13J-1: Re-execute an approved action whose initial execution errored.
// Only rows with status = "approved" + execution_error are retryable; the
// server enforces that gate.
export async function retryApprovalExecution({ approvalId }) {
  const token = await getAuthToken();
  const response = await fetch("/api/apollo/approvals", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approvalId, mode: "retry" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Could not retry approval (${response.status}).`);
  }
  return payload;
}

// 13L: Queue a registry action from Apollo Chat. Server validates the action
// key is registered + tier is recommend/approval_required. Returns the new
// (or deduped existing) pending approval.
export async function queueApprovalFromChat({ actionKey, payload, reasoning }) {
  const token = await getAuthToken();
  const response = await fetch("/api/apollo/approvals", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode: "queue", actionKey, payload, reasoning }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Could not queue approval (${response.status}).`);
  }
  return body;
}
