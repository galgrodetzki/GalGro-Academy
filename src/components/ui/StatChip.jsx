/**
 * StatChip — compact number + label display, used across Apollo, dashboards,
 * and session cards. Variants map to the semantic color palette.
 *
 * Usage:
 *   <StatChip label="Sessions" value={12} />
 *   <StatChip label="Pending" value={5} variant="warning" icon={<Clock size={12} />} />
 */
export default function StatChip({
  label,
  value,
  variant = "neutral", // "neutral" | "success" | "warning" | "danger" | "info"
  icon = null,
  size = "md", // "sm" | "md"
}) {
  const sizeClasses =
    size === "sm"
      ? "px-2 py-1 text-[10px]"
      : "px-3 py-1.5 text-[11px]";

  const variantClasses = {
    neutral: "bg-bg-card2 text-white/80 border-bg-border",
    success: "bg-success-soft text-success border-success-border",
    warning: "bg-warning-soft text-warning border-warning-border",
    danger: "bg-danger-soft text-danger border-danger-border",
    info: "bg-info-soft text-info border-info-border",
    accent: "bg-accent-soft text-accent border-accent/20",
  }[variant];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${sizeClasses} ${variantClasses}`}
    >
      {icon}
      <span className="font-bold tabular-nums">{value}</span>
      <span className="opacity-60 uppercase tracking-wider text-[9px] font-bold">
        {label}
      </span>
    </div>
  );
}
