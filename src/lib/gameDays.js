import { supabase } from "./supabase";

const GAME_DAY_COLUMNS =
  "id,game_date,opponent,notes,created_by,created_at,updated_at";

function toGameDay(row) {
  return {
    id: row.id,
    gameDate: row.game_date,
    opponent: row.opponent,
    notes: row.notes ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sign in as head coach before editing game days.");
  }
  return data.user;
}

function toPayload(input) {
  const opponent = String(input?.opponent ?? "").trim();
  const gameDate = String(input?.gameDate ?? "").trim();
  const notes = String(input?.notes ?? "").trim();

  if (!opponent) throw new Error("Opponent is required.");
  if (!gameDate) throw new Error("Game date is required.");

  return {
    game_date: gameDate,
    opponent,
    notes,
  };
}

export async function fetchGameDays() {
  const { data, error } = await supabase
    .from("game_days")
    .select(GAME_DAY_COLUMNS)
    .order("game_date", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Could not load game days: ${error.message}`);
  return (data ?? []).map(toGameDay);
}

export async function createGameDay(input) {
  const user = await requireUser();
  const payload = { ...toPayload(input), created_by: user.id };
  const { data, error } = await supabase
    .from("game_days")
    .insert(payload)
    .select(GAME_DAY_COLUMNS)
    .single();

  if (error) throw new Error(`Could not create game day: ${error.message}`);
  return toGameDay(data);
}

export async function updateGameDay(id, input) {
  await requireUser();
  const { data, error } = await supabase
    .from("game_days")
    .update(toPayload(input))
    .eq("id", id)
    .select(GAME_DAY_COLUMNS)
    .single();

  if (error) throw new Error(`Could not update game day: ${error.message}`);
  return toGameDay(data);
}

export async function deleteGameDay(id) {
  await requireUser();
  const { error } = await supabase.from("game_days").delete().eq("id", id);
  if (error) throw new Error(`Could not delete game day: ${error.message}`);
}
