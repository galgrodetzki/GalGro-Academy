import { supabase } from "./supabase";

async function runApolloCheck(runType) {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (sessionError || !token) {
    throw new Error("Sign in as head coach before running Apollo checks.");
  }

  const response = await fetch("/api/apollo/runner", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ runType }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Apollo runner returned ${response.status}.`);
  }

  return payload;
}

export function runApolloReadinessCheck() {
  return runApolloCheck("readiness");
}

export function runApolloDepartmentReview() {
  return runApolloCheck("department_review");
}
