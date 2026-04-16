import { motion as Motion } from "framer-motion";

/**
 * Consistent empty-state pattern across the app.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Inbox size={28} />}
 *     title="No sessions yet"
 *     body="Your logged sessions will appear here once you plan your first one."
 *     action={{ label: "Plan a session", onClick: () => goTo("builder") }}
 *   />
 */
export default function EmptyState({
  icon = null,
  title,
  body,
  action = null,
  variant = "default", // "default" | "compact" | "embedded"
  className = "",
}) {
  const isCompact = variant === "compact";
  const isEmbedded = variant === "embedded";

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        ${isEmbedded ? "" : "card"}
        ${isCompact ? "p-6" : "p-10 md:p-14"}
        flex flex-col items-center text-center
        ${className}
      `}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent border border-accent/20">
          {icon}
        </div>
      )}

      <h3 className="font-display text-lg md:text-xl font-bold text-white mb-1.5">
        {title}
      </h3>

      {body && (
        <p className="text-sm text-white/50 max-w-sm leading-relaxed">
          {body}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary mt-5"
        >
          {action.label}
        </button>
      )}
    </Motion.div>
  );
}
