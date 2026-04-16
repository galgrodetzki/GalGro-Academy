/**
 * DepartmentSparkline — 7-bar mini run-history chart for Apollo department cards.
 * Pure SVG, no library. Bars are colored by run status.
 * Empty slots (< 7 runs) show as dim gray.
 *
 * Usage:
 *   <DepartmentSparkline runs={runsArray} />
 *
 * runs: [{ status: "completed" | "failed" | "blocked" | "running" | "queued" }]
 */

const STATUS_COLOR = {
  completed: "#00e87a", // accent green
  failed: "#ef4444",    // danger red
  blocked: "#f59e0b",   // warning yellow
  running: "#4d8fff",   // info blue
  queued: "#2a3048",    // border gray
};

const STATUS_OPACITY = {
  completed: 1,
  failed: 1,
  blocked: 0.9,
  running: 0.85,
  queued: 0.45,
};

const SLOTS = 7;
const W = 56;
const H = 20;
const GAP = 2;
const BAR_W = (W - GAP * (SLOTS - 1)) / SLOTS; // ~6.29

export default function DepartmentSparkline({ runs = [], className = "" }) {
  const bars = Array.from({ length: SLOTS }, (_, i) => {
    const run = runs[i] ?? null;
    return {
      color: run ? (STATUS_COLOR[run.status] ?? STATUS_COLOR.queued) : "#1f2538",
      opacity: run ? (STATUS_OPACITY[run.status] ?? 0.45) : 0.25,
      status: run?.status ?? "empty",
    };
  });

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={`overflow-visible ${className}`}
      aria-label="Run history sparkline"
      role="img"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={i * (BAR_W + GAP)}
          y={0}
          width={BAR_W}
          height={H}
          rx={1.5}
          fill={bar.color}
          opacity={bar.opacity}
        />
      ))}
    </svg>
  );
}
