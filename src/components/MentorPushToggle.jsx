import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  fetchPushConfig,
  getCurrentPushStatus,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/pushSubscription";

// Mentor-D: opt-in toggle for Web Push notifications.
// Renders nothing if the browser doesn't support push or push isn't
// configured on the server yet (so the UI never prompts for permission
// when we can't actually deliver).

const STATE = {
  loading: "loading",
  ready: "ready",
  subscribing: "subscribing",
  subscribed: "subscribed",
  unsubscribing: "unsubscribing",
  denied: "denied",
  unsupported: "unsupported",
  unconfigured: "unconfigured",
  error: "error",
};

export default function MentorPushToggle({ className = "", onToast }) {
  const [state, setState] = useState(STATE.loading);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setState(STATE.unsupported);
      return;
    }
    try {
      const [config, status] = await Promise.all([
        fetchPushConfig(),
        getCurrentPushStatus(),
      ]);
      if (!config?.configured) {
        setState(STATE.unconfigured);
        return;
      }
      if (status.permission === "denied") {
        setState(STATE.denied);
        return;
      }
      setState(status.subscribed ? STATE.subscribed : STATE.ready);
    } catch (err) {
      setState(STATE.error);
      setMessage(err?.message || "Could not read push status.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (state === STATE.unsupported) return null;
  if (state === STATE.unconfigured) return null;

  const handleEnable = async () => {
    setState(STATE.subscribing);
    setMessage("");
    try {
      await subscribeToPush();
      setState(STATE.subscribed);
      onToast?.("Push notifications enabled.");
    } catch (err) {
      setMessage(err?.message || "Could not enable push.");
      setState(STATE.ready);
      onToast?.(err?.message || "Could not enable push.");
    }
  };

  const handleDisable = async () => {
    setState(STATE.unsubscribing);
    setMessage("");
    try {
      await unsubscribeFromPush();
      setState(STATE.ready);
      onToast?.("Push notifications disabled on this device.");
    } catch (err) {
      setMessage(err?.message || "Could not disable push.");
      setState(STATE.subscribed);
      onToast?.(err?.message || "Could not disable push.");
    }
  };

  return (
    <div
      className={`card p-4 border border-bg-border flex items-start gap-3 ${className}`}
    >
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
        {state === STATE.subscribed ? (
          <Bell size={16} className="text-accent" />
        ) : (
          <BellOff size={16} className="text-white/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold mb-0.5">Mentor push notifications</div>
        {state === STATE.denied ? (
          <p className="text-xs text-white/50 leading-relaxed">
            Notifications are blocked in your browser settings for this site.
            Enable them there, then come back and turn this on.
          </p>
        ) : state === STATE.subscribed ? (
          <p className="text-xs text-white/50 leading-relaxed">
            You'll get a notification on this device when Mentor writes a new
            message for you.
          </p>
        ) : (
          <p className="text-xs text-white/50 leading-relaxed">
            Get notified on this device when Mentor sends you a new message —
            training-day notes and game-day prep.
          </p>
        )}
        {message && state === STATE.error && (
          <p className="text-xs text-red-300 mt-1">{message}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {state === STATE.loading ? (
          <Loader2 size={14} className="animate-spin text-white/30" />
        ) : state === STATE.denied ? null : state === STATE.subscribed ? (
          <button
            type="button"
            onClick={handleDisable}
            disabled={state === STATE.unsubscribing}
            className="px-3 py-1.5 rounded-lg border border-bg-border text-[11px] font-bold text-white/60 hover:text-white disabled:opacity-40 flex items-center gap-1.5"
          >
            {state === STATE.unsubscribing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : null}
            Turn off
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={state === STATE.subscribing}
            className="px-3 py-1.5 rounded-lg bg-accent text-black text-[11px] font-bold disabled:opacity-40 flex items-center gap-1.5"
          >
            {state === STATE.subscribing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : null}
            Turn on
          </button>
        )}
      </div>
    </div>
  );
}
