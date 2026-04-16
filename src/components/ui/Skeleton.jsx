/**
 * Shimmer skeleton loader.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton variant="card" />
 *   <SkeletonList count={4} />
 */
export default function Skeleton({ className = "", variant = "default" }) {
  if (variant === "card") {
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    );
  }

  if (variant === "line") {
    return <div className={`skeleton h-3 ${className}`} />;
  }

  return <div className={`skeleton ${className}`} />;
}

export function SkeletonList({ count = 3, variant = "card", className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
