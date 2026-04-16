/**
 * DrillDiagram — data-driven SVG pitch setup for GK drills.
 *
 * Coordinate system: viewBox "0 0 200 150" (4:3, mobile-friendly).
 * Goal is always at the TOP (keeper faces outward/downward).
 *
 * Key pitch coordinates (in viewBox units, approx 1 unit = 0.3 yards):
 *   Goal line:    y = 15
 *   Goal posts:   x = 75 to 125 (width 50)
 *   6-yard box:   x = 60 to 140, y = 15 to 45
 *   18-yard box:  x = 15 to 185, y = 15 to 105
 *   Penalty spot: (100, 70)
 *   Penalty arc:  radius 27 from penalty spot
 *
 * Schema (see src/data/drillDiagrams.js):
 *   {
 *     elements: [
 *       { type: "keeper", x, y, label?: "GK" },
 *       { type: "player", x, y, label?: "C", role?: "server" | "coach" | "striker" },
 *       { type: "cone",   x, y },
 *       { type: "ball",   x, y },
 *       { type: "arrow",  from: [x,y], to: [x,y], kind: "shot" | "pass" | "move" | "cross" },
 *       { type: "label",  x, y, text },
 *     ]
 *   }
 */

const COLORS = {
  pitch: "#0f1321",          // pitch green-dark (we keep it dark for theme)
  lineDark: "#2a3048",       // box/goal line color
  lineFaint: "rgba(255,255,255,0.15)",
  goalNet: "rgba(255,255,255,0.08)",
  keeper: "#00e87a",         // accent
  keeperRing: "rgba(0,232,122,0.25)",
  player: "#4d8fff",         // info blue
  playerRing: "rgba(77,143,255,0.25)",
  striker: "#ef4444",        // danger red for opposing player
  cone: "#ff6b35",           // orange
  ball: "#ffffff",
  shot: "#ef4444",           // red arrow for shot
  pass: "#f59e0b",           // yellow for pass
  move: "#ffffff",           // dashed white for movement
  cross: "#a855f7",          // purple curved for crosses
  label: "rgba(255,255,255,0.55)",
};

function PitchBackground() {
  return (
    <g>
      {/* Pitch fill */}
      <rect x="0" y="0" width="200" height="150" fill={COLORS.pitch} rx="8" />

      {/* Subtle grass texture via horizontal bands */}
      {[25, 50, 75, 100, 125].map((y) => (
        <rect
          key={y}
          x="0"
          y={y}
          width="200"
          height="12"
          fill="rgba(255,255,255,0.012)"
        />
      ))}

      {/* Goal net fill */}
      <rect x="75" y="3" width="50" height="12" fill={COLORS.goalNet} />
      {/* Goal net vertical lines */}
      {[82, 89, 96, 103, 110, 117].map((x) => (
        <line key={x} x1={x} y1="3" x2={x} y2="15" stroke={COLORS.lineFaint} strokeWidth="0.5" />
      ))}

      {/* Goal posts + crossbar */}
      <line x1="75" y1="3" x2="75" y2="15" stroke={COLORS.ball} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="125" y1="3" x2="125" y2="15" stroke={COLORS.ball} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="75" y1="15" x2="125" y2="15" stroke={COLORS.ball} strokeWidth="1.5" strokeLinecap="round" />

      {/* Goal line (across box) */}
      <line x1="0" y1="15" x2="200" y2="15" stroke={COLORS.lineDark} strokeWidth="1" />

      {/* 6-yard box */}
      <rect x="60" y="15" width="80" height="30" fill="none" stroke={COLORS.lineDark} strokeWidth="1.2" />

      {/* 18-yard box */}
      <rect x="15" y="15" width="170" height="90" fill="none" stroke={COLORS.lineDark} strokeWidth="1.2" />

      {/* Penalty spot */}
      <circle cx="100" cy="70" r="1.3" fill={COLORS.lineDark} />

      {/* Penalty arc (only bottom portion, outside box) */}
      <path
        d="M 77 105 A 27 27 0 0 0 123 105"
        fill="none"
        stroke={COLORS.lineDark}
        strokeWidth="1.2"
      />
    </g>
  );
}

function ArrowDefs() {
  return (
    <defs>
      {Object.entries({
        shot: COLORS.shot,
        pass: COLORS.pass,
        move: COLORS.move,
        cross: COLORS.cross,
      }).map(([kind, color]) => (
        <marker
          key={kind}
          id={`arrowhead-${kind}`}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={color} />
        </marker>
      ))}
    </defs>
  );
}

// ── Element renderers ───────────────────────────────────────────────────────

function Keeper({ x, y, label = "GK" }) {
  return (
    <g>
      <circle cx={x} cy={y} r="6.5" fill={COLORS.keeperRing} />
      <circle cx={x} cy={y} r="4.5" fill={COLORS.keeper} />
      <text
        x={x}
        y={y + 1.5}
        textAnchor="middle"
        fontSize="4.5"
        fontWeight="800"
        fill="#0b0e17"
        fontFamily="Inter, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

function Player({ x, y, label = "C", role = "coach" }) {
  const color = role === "striker" ? COLORS.striker : COLORS.player;
  const ringColor = role === "striker" ? "rgba(239,68,68,0.25)" : COLORS.playerRing;
  return (
    <g>
      <circle cx={x} cy={y} r="5.5" fill={ringColor} />
      <circle cx={x} cy={y} r="3.8" fill={color} />
      <text
        x={x}
        y={y + 1.3}
        textAnchor="middle"
        fontSize="3.8"
        fontWeight="800"
        fill="#0b0e17"
        fontFamily="Inter, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

function Cone({ x, y }) {
  // Small orange triangle
  return (
    <polygon
      points={`${x - 2.5},${y + 2.2} ${x + 2.5},${y + 2.2} ${x},${y - 2.5}`}
      fill={COLORS.cone}
      stroke="#cc4a1a"
      strokeWidth="0.4"
    />
  );
}

function Ball({ x, y }) {
  return (
    <g>
      <circle cx={x} cy={y} r="1.8" fill={COLORS.ball} stroke="#333" strokeWidth="0.3" />
    </g>
  );
}

function Arrow({ from, to, kind = "shot" }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const color = COLORS[kind] ?? COLORS.move;
  const dashArray = kind === "move" ? "2 1.5" : undefined;

  if (kind === "cross") {
    // Curved arrow — bezier with control point perpendicular to midpoint
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    // Control point: midpoint + perpendicular offset
    const cx = mx - dy * 0.25;
    const cy = my + dx * 0.25;
    return (
      <path
        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        markerEnd={`url(#arrowhead-${kind})`}
      />
    );
  }

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeDasharray={dashArray}
      markerEnd={`url(#arrowhead-${kind})`}
    />
  );
}

function Label({ x, y, text }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize="4.5"
      fontWeight="600"
      fill={COLORS.label}
      fontFamily="Inter, sans-serif"
    >
      {text}
    </text>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────

function Legend({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/55">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block rounded-full"
            style={{
              width: 8,
              height: 8,
              background: item.color,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function buildLegend(elements = []) {
  const items = [];
  const has = (type) => elements.some((e) => e.type === type);
  const hasArrow = (kind) => elements.some((e) => e.type === "arrow" && e.kind === kind);
  if (has("keeper")) items.push({ label: "Keeper", color: COLORS.keeper });
  if (elements.some((e) => e.type === "player" && e.role !== "striker")) {
    items.push({ label: "Coach / server", color: COLORS.player });
  }
  if (elements.some((e) => e.type === "player" && e.role === "striker")) {
    items.push({ label: "Striker", color: COLORS.striker });
  }
  if (has("cone")) items.push({ label: "Cone", color: COLORS.cone });
  if (has("ball")) items.push({ label: "Ball", color: COLORS.ball });
  if (hasArrow("shot")) items.push({ label: "Shot", color: COLORS.shot });
  if (hasArrow("pass")) items.push({ label: "Pass", color: COLORS.pass });
  if (hasArrow("move")) items.push({ label: "Movement", color: COLORS.move });
  if (hasArrow("cross")) items.push({ label: "Cross", color: COLORS.cross });
  return items;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DrillDiagram({ diagram, className = "" }) {
  if (!diagram || !diagram.elements?.length) return null;

  const { elements } = diagram;
  const legend = buildLegend(elements);

  return (
    <div className={className}>
      <div className="rounded-lg border border-bg-border overflow-hidden bg-bg-soft">
        <svg
          viewBox="0 0 200 150"
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Drill setup diagram"
        >
          <ArrowDefs />
          <PitchBackground />

          {/* Draw elements in order of importance (arrows first, so dots sit on top) */}
          {elements.filter((e) => e.type === "arrow").map((e, i) => (
            <Arrow key={`arrow-${i}`} from={e.from} to={e.to} kind={e.kind} />
          ))}
          {elements.filter((e) => e.type === "cone").map((e, i) => (
            <Cone key={`cone-${i}`} x={e.x} y={e.y} />
          ))}
          {elements.filter((e) => e.type === "ball").map((e, i) => (
            <Ball key={`ball-${i}`} x={e.x} y={e.y} />
          ))}
          {elements.filter((e) => e.type === "player").map((e, i) => (
            <Player key={`player-${i}`} x={e.x} y={e.y} label={e.label} role={e.role} />
          ))}
          {elements.filter((e) => e.type === "keeper").map((e, i) => (
            <Keeper key={`keeper-${i}`} x={e.x} y={e.y} label={e.label} />
          ))}
          {elements.filter((e) => e.type === "label").map((e, i) => (
            <Label key={`label-${i}`} x={e.x} y={e.y} text={e.text} />
          ))}
        </svg>
      </div>
      <Legend items={legend} />
    </div>
  );
}
