import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  HeartHandshake,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react";
import {
  dismissMentorMessage,
  fetchMyMentorMessages,
  markMentorMessageRead,
} from "../lib/mentorMessages";

// Mentor-C3: keeper-facing feed of Mentor messages.
// RLS ensures a signed-in keeper only sees their own rows, so this works for
// every role that has keeper-linked auth. The coach sees all keepers via a
// different view (AdminMentorActivityPanel).

const TRIGGER_COLORS = {
  training_day: {
    border: "border-accent/25",
    bg: "bg-accent/5",
    chip: "text-accent/80 bg-accent/15 border-accent/25",
    icon: "text-accent",
    label: "Training day",
  },
  game_day: {
    border: "border-red-500/25",
    bg: "bg-red-500/5",
    chip: "text-red-300 bg-red-500/15 border-red-500/25",
    icon: "text-red-300",
    label: "Game day",
  },
  game_day_eve: {
    border: "border-orange/25",
    bg: "bg-orange/5",
    chip: "text-orange bg-orange/10 border-orange/25",
    icon: "text-orange",
    label: "Before game",
  },
};

function formatTriggerDate(key) {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  const when = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(when, today)) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(when, yesterday)) return "Yesterday";
  return when.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function MentorFeed({ className = "", limit = 10, onToast }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setError("");
      const rows = await fetchMyMentorMessages({ limit });
      setMessages(rows);
    } catch (err) {
      setError(err?.message || "Could not load Mentor messages.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  const visible = useMemo(
    () => messages.filter((m) => m.status !== "dismissed"),
    [messages]
  );
  const unreadCount = visible.filter((m) => m.status === "unread").length;

  const handleRead = async (id) => {
    try {
      const updated = await markMentorMessageRead(id);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      onToast?.(err?.message || "Could not mark as read.");
    }
  };

  const handleDismiss = async (id) => {
    try {
      const updated = await dismissMentorMessage(id);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      onToast?.(err?.message || "Could not dismiss.");
    }
  };

  if (loading) {
    return (
      <div className={`card p-4 border border-bg-border ${className}`}>
        <div className="text-xs text-white/40">Loading Mentor…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card p-4 border-red-500/30 bg-red-500/5 ${className}`}>
        <div className="text-xs text-red-300">{error}</div>
      </div>
    );
  }

  if (visible.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HeartHandshake size={15} className="text-accent" />
          <h3 className="font-display font-bold text-sm">Mentor</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-black text-black bg-accent rounded-full min-w-[18px] h-4 px-1 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] text-white/30 flex items-center gap-1">
          <Sparkles size={10} />
          written for you
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((msg) => {
          const colors = TRIGGER_COLORS[msg.triggerType] || TRIGGER_COLORS.training_day;
          const isUnread = msg.status === "unread";
          return (
            <div
              key={msg.id}
              className={`card p-4 border ${colors.border} ${isUnread ? colors.bg : "border-bg-border"} transition-colors`}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-bg-soft flex items-center justify-center flex-shrink-0`}>
                  <MessageSquareText size={14} className={colors.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.chip}`}
                    >
                      {colors.label}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {formatTriggerDate(msg.triggerDate)}
                    </span>
                    {isUnread && (
                      <span className="text-[9px] font-black text-black bg-accent rounded px-1 py-[1px]">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold mt-1">{msg.title}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleRead(msg.id)}
                      title="Mark as read"
                      className="text-white/40 hover:text-accent transition-colors p-1"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismiss(msg.id)}
                    title="Dismiss"
                    className="text-white/30 hover:text-red-400 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed pl-11">
                {msg.body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
