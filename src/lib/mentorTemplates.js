import { supabase } from "./supabase";

// Mentor-B: template authoring.
// Coach-writes, everyone-reads. The generator (Mentor-C) consumes these by
// trigger_type to produce per-keeper mentor_messages.

const TEMPLATE_COLUMNS =
  "id,trigger_type,title,body,audience,enabled,tags,created_by,created_at,updated_at";

export const TRIGGER_TYPES = [
  { value: "training_day",  label: "Training day",           help: "Sent on days with a scheduled session." },
  { value: "game_day_eve",  label: "Night before game",       help: "Sent the evening before a game day." },
  { value: "game_day",      label: "Game day",                help: "Sent on match days." },
  { value: "birthday",      label: "Birthday",                help: "Sent when today matches the keeper's birthday (month + day)." },
];

// Placeholders the generator knows how to substitute. Shown in the UI so
// authors know what they can use. keeper_name falls back to the keeper's
// first auth name if they haven't set preferred_name yet — templates never
// render raw {{preferred_name}} back to the keeper.
export const TEMPLATE_VARIABLES = [
  { token: "{{keeper_name}}",     description: "Preferred name (or first auth name) of the keeper." },
  { token: "{{preferred_name}}",  description: "Alias for keeper_name — same value." },
  { token: "{{current_focus}}",   description: "What the keeper is currently working on (from their profile)." },
  { token: "{{idol}}",            description: "Keeper the athlete looks up to (from their profile)." },
  { token: "{{opponent}}",        description: "Opponent for game_day / game_day_eve." },
  { token: "{{game_date}}",       description: "Human date of the game." },
  { token: "{{session_name}}",    description: "Session name for training_day." },
  { token: "{{session_target}}",  description: "Session target/focus for training_day." },
];

function toTemplate(row) {
  return {
    id: row.id,
    triggerType: row.trigger_type,
    title: row.title,
    body: row.body,
    audience: row.audience,
    enabled: row.enabled,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sign in as head coach before editing Mentor templates.");
  }
  return data.user;
}

function toPayload(input) {
  const title = String(input?.title ?? "").trim();
  const body = String(input?.body ?? "").trim();
  const triggerType = String(input?.triggerType ?? "").trim();
  if (!title) throw new Error("Title is required.");
  if (!body) throw new Error("Body is required.");
  if (!TRIGGER_TYPES.some((t) => t.value === triggerType)) {
    throw new Error("Pick a valid trigger type.");
  }
  return {
    trigger_type: triggerType,
    title,
    body,
    audience: "keeper",
    enabled: input?.enabled !== false,
    tags: Array.isArray(input?.tags) ? input.tags.filter(Boolean) : [],
  };
}

export async function fetchMentorTemplates() {
  const { data, error } = await supabase
    .from("mentor_templates")
    .select(TEMPLATE_COLUMNS)
    .order("trigger_type", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Could not load Mentor templates: ${error.message}`);
  return (data ?? []).map(toTemplate);
}

export async function createMentorTemplate(input) {
  const user = await requireUser();
  const payload = { ...toPayload(input), created_by: user.id };
  const { data, error } = await supabase
    .from("mentor_templates")
    .insert(payload)
    .select(TEMPLATE_COLUMNS)
    .single();

  if (error) throw new Error(`Could not create template: ${error.message}`);
  return toTemplate(data);
}

export async function updateMentorTemplate(id, input) {
  await requireUser();
  const { data, error } = await supabase
    .from("mentor_templates")
    .update(toPayload(input))
    .eq("id", id)
    .select(TEMPLATE_COLUMNS)
    .single();

  if (error) throw new Error(`Could not update template: ${error.message}`);
  return toTemplate(data);
}

export async function deleteMentorTemplate(id) {
  await requireUser();
  const { error } = await supabase
    .from("mentor_templates")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Could not delete template: ${error.message}`);
}

export async function setMentorTemplateEnabled(id, enabled) {
  await requireUser();
  const { data, error } = await supabase
    .from("mentor_templates")
    .update({ enabled })
    .eq("id", id)
    .select(TEMPLATE_COLUMNS)
    .single();
  if (error) throw new Error(`Could not toggle template: ${error.message}`);
  return toTemplate(data);
}
