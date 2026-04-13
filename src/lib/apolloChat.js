import { supabase } from "./supabase";

export async function sendApolloChatMessage(message) {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (sessionError || !token) {
    throw new Error("Sign in as head coach before chatting with Apollo.");
  }

  const response = await fetch("/api/apollo/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Apollo chat returned ${response.status}.`);
  }

  return payload;
}
