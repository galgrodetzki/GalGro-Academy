import { motion as Motion } from "framer-motion";

const pulseTransition = {
  duration: 3.2,
  repeat: Infinity,
  repeatType: "reverse",
  ease: [0.22, 1, 0.36, 1],
};

export default function TacticalField({
  title = "Keeper map",
  subtitle = "Session shape",
  mode = "command",
  className = "",
}) {
  const isCommand = mode === "command";

  return (
    <div className={`workspace-panel relative min-h-[260px] overflow-hidden p-4 ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),transparent_42%,rgba(77,143,255,0.045))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent/45 via-white/10 to-electric/35" />

      <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="quiet-label">{title}</div>
          <div className="mt-1 text-sm font-semibold text-white/70">{subtitle}</div>
        </div>
        <span className="chip chip-info">{isCommand ? "Live surface" : "Drill logic"}</span>
      </div>

      <svg
        viewBox="0 0 560 330"
        role="img"
        aria-label="Goalkeeper tactical field visualization"
        className="relative z-10 h-[210px] w-full"
      >
        <defs>
          <linearGradient id="fieldStroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,232,122,0.55)" />
            <stop offset="100%" stopColor="rgba(77,143,255,0.45)" />
          </linearGradient>
          <linearGradient id="keeperLane" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(0,232,122,0.1)" />
            <stop offset="52%" stopColor="rgba(0,232,122,0.22)" />
            <stop offset="100%" stopColor="rgba(77,143,255,0.12)" />
          </linearGradient>
        </defs>

        <rect x="28" y="20" width="504" height="290" rx="16" fill="rgba(0,0,0,0.12)" stroke="rgba(255,255,255,0.08)" />
        <path d="M280 20V310" stroke="rgba(255,255,255,0.055)" strokeDasharray="4 9" />
        <circle cx="280" cy="165" r="48" fill="none" stroke="rgba(255,255,255,0.055)" />

        <rect x="28" y="92" width="86" height="146" fill="none" stroke="rgba(255,255,255,0.085)" />
        <rect x="28" y="124" width="35" height="82" fill="none" stroke="rgba(255,255,255,0.085)" />
        <path d="M114 110C150 130 150 200 114 220" fill="none" stroke="rgba(255,255,255,0.055)" />

        <rect x="446" y="92" width="86" height="146" fill="none" stroke="rgba(255,255,255,0.085)" />
        <rect x="497" y="124" width="35" height="82" fill="none" stroke="rgba(255,255,255,0.085)" />
        <path d="M446 110C410 130 410 200 446 220" fill="none" stroke="rgba(255,255,255,0.055)" />

        <Motion.path
          d="M64 165C116 114 165 94 232 116C296 137 322 196 392 202C444 206 484 178 504 148"
          fill="none"
          stroke="url(#fieldStroke)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0.18, opacity: 0.35 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        <Motion.path
          d="M74 208C134 226 192 218 238 184C284 150 323 128 383 134C430 139 470 158 500 190"
          fill="none"
          stroke="rgba(77,143,255,0.38)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="8 9"
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={pulseTransition}
        />

        <Motion.rect
          x="54"
          y="126"
          width="78"
          height="78"
          rx="14"
          fill="url(#keeperLane)"
          stroke="rgba(0,232,122,0.28)"
          animate={{ opacity: [0.5, 0.88, 0.5] }}
          transition={pulseTransition}
        />

        {[
          [64, 165, "GK"],
          [232, 116, "1"],
          [392, 202, "2"],
          [504, 148, "3"],
        ].map(([x, y, label], index) => (
          <Motion.g
            key={label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.16 + index * 0.08, type: "spring", stiffness: 320, damping: 24 }}
          >
            <circle cx={x} cy={y} r="14" fill={index === 0 ? "rgba(0,232,122,0.18)" : "rgba(255,255,255,0.08)"} stroke={index === 0 ? "rgba(0,232,122,0.65)" : "rgba(255,255,255,0.18)"} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill={index === 0 ? "#00e87a" : "rgba(255,255,255,0.72)"}>
              {label}
            </text>
          </Motion.g>
        ))}
      </svg>
    </div>
  );
}
