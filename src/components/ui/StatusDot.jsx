/**
 * StatusDot — live indicator dot used by Apollo, session status, heartbeat.
 *
 * Usage:
 *   <StatusDot state="live" label="Heartbeat armed" />
 *   <StatusDot state="warn" />
 *   <StatusDot state="idle" label="Locked" />
 */
export default function StatusDot({
  state = "idle", // "live" | "warn" | "danger" | "idle"
  label = null,
  className = "",
}) {
  const dotClass = {
    live: "status-dot-live",
    warn: "status-dot-warn",
    danger: "status-dot-danger",
    idle: "status-dot-idle",
  }[state];

  const textClass = {
    live: "text-accent",
    warn: "text-warning",
    danger: "text-danger",
    idle: "text-white/50",
  }[state];

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${textClass} ${className}`}>
      <span className={`status-dot ${dotClass}`} />
      {label}
    </span>
  );
}
