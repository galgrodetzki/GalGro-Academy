const SESSION_NAV_INTENT_KEY = "galgro-session-nav-intent";

export function writeSessionNavIntent(intent) {
  try {
    sessionStorage.setItem(SESSION_NAV_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // sessionStorage can be unavailable in strict privacy modes.
  }
}

export function readSessionNavIntent() {
  try {
    const raw = sessionStorage.getItem(SESSION_NAV_INTENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.tab !== "upcoming" && parsed?.tab !== "past") return null;

    return {
      tab: parsed.tab,
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : "",
    };
  } catch {
    return null;
  }
}

export function clearSessionNavIntent() {
  try {
    sessionStorage.removeItem(SESSION_NAV_INTENT_KEY);
  } catch {
    // sessionStorage can be unavailable in strict privacy modes.
  }
}
