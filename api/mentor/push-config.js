// Mentor-D: returns the public VAPID key so the browser can subscribe to push.
// Safe to expose; this is the counterpart to the server-only private key.
// Also reports whether push is configured so the UI can show the right state.

import { getVapidPublicKey, isPushConfigured } from "./_push.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export default async function handler() {
  return new Response(
    JSON.stringify({
      configured: isPushConfigured(),
      publicKey: isPushConfigured() ? getVapidPublicKey() : null,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
}
