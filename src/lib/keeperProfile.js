import { supabase } from "./supabase";

// Mentor-E1: keeper-scoped profile enrichment.
// Backed by the `update_own_profile_details` SECURITY DEFINER RPC that can
// only touch the five enrichment fields (preferred_name, birthday,
// current_focus, idol, bio) — role/access_expires_on stay coach-only.

export function firstNameOf(fullName) {
  if (!fullName) return "";
  const trimmed = String(fullName).trim();
  if (!trimmed) return "";
  const [first] = trimmed.split(/\s+/, 1);
  return first || "";
}

// A keeper still needs onboarding when they have no preferred_name set.
// We treat preferred_name as the "at least one field complete" marker so the
// modal doesn't re-fire after someone filled something in (even if they
// deliberately left birthday blank).
export function needsKeeperOnboarding(profile) {
  if (!profile) return false;
  if (profile.role !== "keeper") return false;
  return !profile.preferred_name || !profile.preferred_name.trim();
}

export async function updateOwnProfileDetails({
  preferredName = "",
  birthday = null,
  currentFocus = "",
  idol = "",
  bio = "",
}) {
  const { error } = await supabase.rpc("update_own_profile_details", {
    p_preferred_name: preferredName,
    p_birthday: birthday,
    p_current_focus: currentFocus,
    p_idol: idol,
    p_bio: bio,
  });
  if (error) throw error;
}
