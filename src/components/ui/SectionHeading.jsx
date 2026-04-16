/**
 * Consistent section heading pattern used inside pages and cards.
 * Use PageHeader for top-of-page titles, SectionHeading for groupings.
 *
 * Usage:
 *   <SectionHeading
 *     overline="This week"
 *     title="Upcoming sessions"
 *     hint="Next 7 days"
 *     action={<button className="btn btn-ghost text-xs">View all</button>}
 *   />
 */
export default function SectionHeading({
  overline = null,
  title,
  hint = null,
  action = null,
  className = "",
}) {
  return (
    <div className={`flex items-end justify-between gap-3 mb-3 ${className}`}>
      <div>
        {overline && (
          <div className="brand-overline mb-1.5">{overline}</div>
        )}
        <h2 className="font-display text-base md:text-lg font-bold text-white">
          {title}
        </h2>
        {hint && (
          <p className="text-[11px] text-white/40 mt-0.5">{hint}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
