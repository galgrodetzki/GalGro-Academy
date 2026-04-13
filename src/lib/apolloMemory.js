import { supabase } from "./supabase";

const MEMORY_COLUMNS = "id,memory_key,memory_type,title,body,sensitivity,metadata,created_at,updated_at";

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function toMemory(row) {
  return {
    id: row.id,
    key: row.memory_key,
    type: row.memory_type,
    title: row.title,
    body: row.body,
    sensitivity: row.sensitivity,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPayload(memory, userId, existingKey = "") {
  const timestamp = new Date().toISOString();
  const keyBase = slugify(memory.title) || "memory";
  const payload = {
    memory_key: existingKey || `${memory.type}-${keyBase}-${Date.now().toString(36)}`,
    memory_type: memory.type,
    title: memory.title.trim(),
    body: memory.body.trim(),
    sensitivity: memory.sensitivity,
    metadata: {
      source: "apollo_memory_ui",
    },
    updated_by: userId,
    updated_at: timestamp,
  };

  if (!existingKey) {
    payload.created_by = userId;
  }

  return payload;
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in as head coach before changing Apollo memory.");
  return data.user;
}

export async function fetchApolloMemory() {
  const { data, error } = await supabase
    .from("apollo_memory")
    .select(MEMORY_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(`Could not load Apollo memory: ${error.message}`);
  return (data ?? []).map(toMemory);
}

export async function createApolloMemory(memory) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("apollo_memory")
    .insert(toPayload(memory, user.id))
    .select(MEMORY_COLUMNS)
    .single();

  if (error) throw new Error(`Could not create Apollo memory: ${error.message}`);
  return toMemory(data);
}

export async function updateApolloMemory(memory) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("apollo_memory")
    .update(toPayload(memory, user.id, memory.key))
    .eq("id", memory.id)
    .select(MEMORY_COLUMNS)
    .single();

  if (error) throw new Error(`Could not update Apollo memory: ${error.message}`);
  return toMemory(data);
}

export async function deleteApolloMemory(id) {
  await requireUser();
  const { error } = await supabase
    .from("apollo_memory")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Could not delete Apollo memory: ${error.message}`);
}
