import { supabase } from "./supabase";

export async function fetchApolloStatus() {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (sessionError || !token) {
    throw new Error("Sign in as head coach before reading Apollo status.");
  }

  const response = await fetch("/api/apollo/status", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Apollo status returned ${response.status}.`);
  }

  return payload;
}
