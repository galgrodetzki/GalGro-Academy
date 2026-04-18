// Mentor-D: shared Web Push helpers used by both the subscribe endpoint and
// the generator. web-push requires VAPID keys:
//   - VAPID_PUBLIC_KEY  (safe to expose to the browser)
//   - VAPID_PRIVATE_KEY (server-only secret; NEVER VITE_)
//   - VAPID_SUBJECT     ("mailto:you@domain" or "https://site.com")
//
// Generate with: `npx web-push generate-vapid-keys` then paste into Vercel
// env vars (server-side, Production + Preview). If keys are missing, the
// push path short-circuits to a no-op — the in-app MentorFeed still works.

import webpush from "web-push";

// Trim whitespace because pasted env-var values often include trailing
// newlines / spaces that make web-push reject otherwise-valid keys.
const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
const VAPID_SUBJECT = (process.env.VAPID_SUBJECT ?? "mailto:galgrodetzki@gmail.com").trim();

let vapidConfigured = false;
let vapidConfigError = null;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch (err) {
    vapidConfigError = err?.message || String(err);
    // Enriched log: without this we only see "invalid VAPID" with no detail on
    // which key failed or what length was received.
    console.warn(
      "Mentor push: invalid VAPID keys — "
      + `publicLen=${VAPID_PUBLIC_KEY.length} privateLen=${VAPID_PRIVATE_KEY.length} `
      + `subject=${VAPID_SUBJECT} error=${vapidConfigError}`
    );
  }
} else {
  vapidConfigError = `missing key(s): public=${Boolean(VAPID_PUBLIC_KEY)} private=${Boolean(VAPID_PRIVATE_KEY)}`;
}

export function getVapidConfigError() {
  return vapidConfigError;
}

export function isPushConfigured() {
  return vapidConfigured;
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

// Sends a push; returns { ok, statusCode?, error? }. Callers decide whether
// to delete the subscription or record the error.
export async function sendPush(subscription, payload) {
  if (!vapidConfigured) {
    return { ok: false, error: "push_not_configured" };
  }
  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 } // 1 day — mentor notes aren't urgent enough to queue longer
    );
    return { ok: true, statusCode: result?.statusCode ?? 201 };
  } catch (err) {
    const status = err?.statusCode ?? 0;
    return {
      ok: false,
      statusCode: status,
      error: err?.body || err?.message || "push_failed",
      shouldPrune: status === 404 || status === 410, // gone → delete subscription
    };
  }
}
