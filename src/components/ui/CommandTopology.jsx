import { motion as Motion } from "framer-motion";

// Apollo command topology — thematic alternative to the goalkeeper tactical
// field. A central Apollo node with department satellites and signal pulses
// flowing inward to convey "departments report upward before action".
//
// Inputs:
//   departments: [{ key, label, state }]  — state is "ok" | "warn" | "idle"
//   title, subtitle: header copy
//
// Honest about what it shows: node states come from the caller, pulses are
// purely decorative (one signal travels on one edge at a time on a rotating
// schedule), the layout is geometric not data-driven beyond state colors.

const STATE_COLOR = {
  ok:   "rgba(0,232,122,0.78)",   // accent
  warn: "rgba(245,158,11,0.82)",  // warning amber
  idle: "rgba(255,255,255,0.32)",
};

const STATE_GLOW = {
  ok:   "rgba(0,232,122,0.22)",
  warn: "rgba(245,158,11,0.22)",
  idle: "rgba(255,255,255,0.06)",
};

// Positions on the 560×330 viewBox for up to 6 satellites arranged in an arc.
// Hand-tuned so labels don't overlap at common counts (3–6).
const LAYOUTS = {
  3: [[120, 90], [440, 90], [280, 260]],
  4: [[120, 90], [440, 90], [120, 240], [440, 240]],
  5: [[100, 95], [280, 70], [460, 95], [160, 250], [400, 250]],
  6: [[100, 95], [280, 70], [460, 95], [100, 240], [280, 265], [460, 240]],
};

export default function CommandTopology({
  title = "Command topology",
  subtitle = "Departments report upward",
  departments = [],
  className = "",
}) {
  const count = Math.min(Math.max(departments.length, 3), 6);
  const layout = LAYOUTS[count] ?? LAYOUTS[5];
  const nodes = departments.slice(0, count).map((dept, i) => ({
    ...dept,
    x: layout[i][0],
    y: layout[i][1],
  }));

  return (
    <div className={`workspace-panel relative min-h-[260px] overflow-hidden p-4 ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(77,143,255,0.05),transparent_45%,rgba(0,232,122,0.04))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-electric/35 via-white/10 to-accent/35" />

      <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="quiet-label">{title}</div>
          <div className="mt-1 text-sm font-semibold text-white/70">{subtitle}</div>
        </div>
        <span className="chip chip-info">Live topology</span>
      </div>

      <svg
        viewBox="0 0 560 330"
        role="img"
        aria-label="Apollo command topology — departments reporting to a central commander"
        className="relative z-10 h-[210px] w-full"
      >
        <defs>
          <radialGradient id="apolloCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,232,122,0.55)" />
            <stop offset="60%" stopColor="rgba(0,232,122,0.18)" />
            <stop offset="100%" stopColor="rgba(0,232,122,0)" />
          </radialGradient>
          <linearGradient id="reportLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="50%" stopColor="rgba(0,232,122,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>

        {/* Concentric trust rings — decorative scaffolding */}
        <circle cx="280" cy="165" r="120" fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 8" />
        <circle cx="280" cy="165" r="78" fill="none" stroke="rgba(255,255,255,0.04)" />

        {/* Department → Apollo connection lines */}
        {nodes.map((node) => (
          <line
            key={`line-${node.key}`}
            x1={node.x}
            y1={node.y}
            x2="280"
            y2="165"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Signal pulse traveling inward on one edge at a time — scheduled by
            animation delay so edges take turns rather than all pulsing at once. */}
        {nodes.map((node, index) => (
          <Motion.circle
            key={`pulse-${node.key}`}
            r="3"
            fill="rgba(0,232,122,0.85)"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.9, 0],
              cx: [node.x, 280],
              cy: [node.y, 165],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              delay: index * (4 / count),
              repeatDelay: 4 - 1.6,
              ease: [0.45, 0, 0.55, 1],
            }}
          />
        ))}

        {/* Apollo core — central commander node */}
        <Motion.circle
          cx="280"
          cy="165"
          r="32"
          fill="url(#apolloCore)"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle cx="280" cy="165" r="14" fill="rgba(0,232,122,0.22)" stroke="rgba(0,232,122,0.75)" strokeWidth="1.25" />
        <text x="280" y="169" textAnchor="middle" fontSize="10" fontWeight="800" fill="#00e87a" letterSpacing="1">
          APOLLO
        </text>

        {/* Department nodes + labels */}
        {nodes.map((node, index) => {
          const state = node.state ?? "idle";
          return (
            <Motion.g
              key={`node-${node.key}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 + index * 0.06, type: "spring", stiffness: 320, damping: 24 }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r="14"
                fill={STATE_GLOW[state]}
                stroke={STATE_COLOR[state]}
                strokeWidth="1.25"
              />
              <circle cx={node.x} cy={node.y} r="3" fill={STATE_COLOR[state]} />
              <text
                x={node.x}
                y={node.y < 165 ? node.y - 22 : node.y + 30}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="rgba(255,255,255,0.72)"
                letterSpacing="0.5"
              >
                {node.label}
              </text>
            </Motion.g>
          );
        })}
      </svg>
    </div>
  );
}
