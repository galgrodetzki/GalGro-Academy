import { supabase } from "./supabase";

// Mentor-C: per-keeper generated messages.
// RLS gates visibility: keepers see their own rows; head coach sees all.
// Clients call `markMentorMessageRead` to update status; the generator
// endpoint is the only writer (via service-role or head-coach session).

const MESSAGE_COLUMNS =
  "id,keeper_profile_id,trigger_date,trigger_type,template_id,source_session_id,source_game_day_id,generated_title,generated_body,metadata,status,delivered_at,read_at,created_at,updated_at";

function toMessage(row) {
  return {
    id: row.id,
    keeperProfileId: row.keeper_profile_id,
    triggerDate: row.trigger_date,
    triggerType: row.trigger_type,
    templateId: row.template_id,
    sourceSessionId: row.source_session_id,
    sourceGameDayId: row.source_game_day_id,
    title: row.generated_title,
    body: row.generated_body,
    metadata: row.metadata ?? {},
    status: row.status,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Fetch messages for the signed-in keeper, newest trigger_date first.
// RLS will filter — no explicit .eq() needed for keepers; the coach view
// passes `keeperProfileId` to see a specific keeper's feed.
export async function fetchMyMentorMessages({ limit = 30, keeperProfileId = null } = {}) {
  let query = supabase
    .from("mentor_messages")
    .select(MESSAGE_COLUMNS)
    .order("trigger_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (keeperProfileId) query = query.eq("keeper_profile_id", keeperProfileId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load mentor messages: ${error.message}`);
  return (data ?? []).map(toMessage);
}

export async function markMentorMessageRead(id) {
  const { data, error } = await supabase
    .from("mentor_messages")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", id)
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw new Error(`Could not mark as read: ${error.message}`);
  return toMessage(data);
}

export async function dismissMentorMessage(id) {
  const { data, error } = await supabase
    .from("mentor_messages")
    .update({ status: "dismissed", read_at: new Date().toISOString() })
    .eq("id", id)
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw new Error(`Could not dismiss: ${error.message}`);
  return toMessage(data);
}

// Trigger the generator from the Admin UI. Uses the head-coach session so
// RLS gates the insert path; server-side cron runs with the runner secret.
export async function runMentorGenerator() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sign in as head coach first.");
  const response = await fetch("/api/mentor/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Generator failed (${response.status}).`);
  }
  return payload;
}
