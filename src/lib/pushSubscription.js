import { supabase } from "./supabase";

// Mentor-D: client-side push subscription helpers.
// Flow:
//   1. fetchPushConfig() → { configured, publicKey } from the server.
//   2. subscribeToPush() → asks for permission, registers SW (if needed),
//      calls pushManager.subscribe(), upserts into push_subscriptions via
//      Supabase (RLS policy lets the signed-in user insert their own row).
//   3. unsubscribeFromPush() → removes the row + unsubscribes the browser.

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(base64) : "";
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function arrayBufferToBase64(buffer) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === "function" ? btoa(binary) : "";
}

export function isPushSupported() {
  return (
    typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window
  );
}

export async function fetchPushConfig() {
  const response = await fetch("/api/mentor/push-config");
  if (!response.ok) throw new Error("Push config unavailable.");
  return response.json();
}

async function getOrRegisterServiceWorker() {
  // Prefer an already-controlling SW; otherwise register /sw.js which holds
  // both the cache and push handlers.
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export async function getCurrentPushStatus() {
  if (!isPushSupported()) return { supported: false };
  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  return {
    supported: true,
    permission,
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint ?? null,
  };
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error("This browser doesn't support push notifications.");
  }
  const config = await fetchPushConfig();
  if (!config?.configured || !config?.publicKey) {
    throw new Error("Push isn't configured yet — ask the coach to set the VAPID keys.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied.");
  }

  const registration = await getOrRegisterServiceWorker();
  // readiness ensures the SW is active before we subscribe.
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
  }

  const json = subscription.toJSON();
  const p256dh = json?.keys?.p256dh || arrayBufferToBase64(subscription.getKey?.("p256dh"));
  const auth = json?.keys?.auth || arrayBufferToBase64(subscription.getKey?.("auth"));

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Sign in before enabling push notifications.");
  }

  const payload = {
    profile_id: userData.user.id,
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
  };

  // upsert by endpoint so re-enabling on the same device doesn't duplicate.
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(payload, { onConflict: "endpoint" });
  if (error) {
    // Best-effort rollback: if the row didn't save, release the browser
    // subscription so the next attempt starts cleanly.
    await subscription.unsubscribe().catch(() => {});
    throw new Error(`Could not save subscription: ${error.message}`);
  }
  return { endpoint: subscription.endpoint };
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("profile_id", userData.user.id);
  }
}
