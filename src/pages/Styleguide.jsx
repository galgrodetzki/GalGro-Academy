import { Inbox, Activity, Clock, AlertTriangle, CheckCircle2, Zap, Target } from "lucide-react";
import PageHeader from "../components/PageHeader";
import BrandMark, { BrandGlyph } from "../components/BrandMark";
import EmptyState from "../components/ui/EmptyState";
import Skeleton, { SkeletonList } from "../components/ui/Skeleton";
import StatChip from "../components/ui/StatChip";
import SectionHeading from "../components/ui/SectionHeading";
import StatusDot from "../components/ui/StatusDot";

/**
 * Design system reference. Everything the app uses visually lives here.
 * Head-coach only. Linked from Admin page.
 *
 * Restraint rules baked into this doc:
 *   - Ambient auras: one per screen, top-right, never stacked
 *   - Noise overlay: only on hero/empty/auth surfaces, never on data rows
 *   - Status dots: always semantic (live/warn/danger/idle), never decorative
 */
export default function Styleguide() {
  return (
    <div>
      <PageHeader
        title="Design System"
        subtitle="Visual primitives, tokens, and restraint rules. Head-coach reference."
      />

      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Brand"
          title="Logo & wordmark"
          hint="BrandGlyph (icon only) and BrandMark (icon + text)."
        />
        <div className="card p-6 flex flex-wrap items-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <BrandGlyph className="h-16 w-16" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Glyph</span>
          </div>
          <BrandMark glyphClassName="h-12 w-12" textSize="text-xl" />
          <BrandMark glyphClassName="h-10 w-10" compact />
        </div>
      </section>

      {/* ── Color tokens ───────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Tokens"
          title="Color palette"
          hint="Use semantic names. Never hex in components."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Swatch name="bg" hex="#0b0e17" />
          <Swatch name="bg-soft" hex="#111520" />
          <Swatch name="bg-card" hex="#181d2e" />
          <Swatch name="bg-card2" hex="#1f2538" />
          <Swatch name="accent" hex="#00e87a" dark />
          <Swatch name="info" hex="#4d8fff" />
          <Swatch name="success" hex="#10b981" />
          <Swatch name="warning" hex="#f59e0b" dark />
          <Swatch name="danger" hex="#ef4444" />
          <Swatch name="electric.purple" hex="#a855f7" />
          <Swatch name="electric.pink" hex="#ec4899" />
          <Swatch name="orange" hex="#ff6b35" />
        </div>
      </section>

      {/* ── Typography ─────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Tokens"
          title="Typography scale"
          hint="Space Grotesk for display, Inter for body."
        />
        <div className="card p-6 space-y-4">
          <div>
            <div className="brand-overline mb-2">Overline</div>
            <div className="text-[10px] text-white/40">.brand-overline — uppercase, tracked, accent</div>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Display Large</h1>
            <div className="text-[10px] text-white/40 mt-1">font-display text-3xl — page titles</div>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Display Medium</h2>
            <div className="text-[10px] text-white/40 mt-1">font-display text-xl — section headings</div>
          </div>
          <div>
            <p className="text-sm leading-relaxed text-white/80">Body text. Uses Inter. Leading relaxed for readability on mobile.</p>
            <div className="text-[10px] text-white/40 mt-1">text-sm text-white/80 — body copy</div>
          </div>
          <div>
            <span className="label">Label style</span>
            <div className="text-[10px] text-white/40">.label — uppercase, tracked, form labels</div>
          </div>
        </div>
      </section>

      {/* ── Status dots ────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Primitives"
          title="Status indicators"
          hint="Live dots for Apollo, sessions, heartbeat. Always semantic."
        />
        <div className="card p-6 flex flex-wrap gap-6">
          <StatusDot state="live" label="Heartbeat armed" />
          <StatusDot state="warn" label="Stale for 2h" />
          <StatusDot state="danger" label="Run failed" />
          <StatusDot state="idle" label="Locked" />
        </div>
      </section>

      {/* ── Stat chips ─────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Primitives"
          title="Stat chips"
          hint="Compact number + label. Used by Apollo, dashboards, filters."
        />
        <div className="card p-6 flex flex-wrap gap-2">
          <StatChip label="Sessions" value={12} />
          <StatChip label="Open" value={3} variant="accent" icon={<Activity size={11} />} />
          <StatChip label="Pending" value={5} variant="warning" icon={<Clock size={11} />} />
          <StatChip label="Failed" value={1} variant="danger" icon={<AlertTriangle size={11} />} />
          <StatChip label="Passed" value={27} variant="success" icon={<CheckCircle2 size={11} />} />
          <StatChip label="Proposals" value={5} variant="info" icon={<Target size={11} />} />
          <StatChip label="Runs" value={21} size="sm" />
        </div>
      </section>

      {/* ── Chips / tags ───────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Primitives"
          title="Chips"
          hint=".chip-* utility classes for semantic pill badges."
        />
        <div className="card p-6 flex flex-wrap gap-2">
          <span className="chip chip-neutral"><Zap size={10} /> Neutral</span>
          <span className="chip chip-success"><CheckCircle2 size={10} /> Success</span>
          <span className="chip chip-warning"><Clock size={10} /> Warning</span>
          <span className="chip chip-danger"><AlertTriangle size={10} /> Danger</span>
          <span className="chip chip-info"><Activity size={10} /> Info</span>
        </div>
      </section>

      {/* ── Buttons ────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Primitives"
          title="Buttons"
          hint=".btn base + variant class."
        />
        <div className="card p-6 flex flex-wrap gap-3">
          <button className="btn btn-primary">Primary</button>
          <button className="btn btn-secondary">Secondary</button>
          <button className="btn btn-ghost">Ghost</button>
        </div>
      </section>

      {/* ── Ambient surfaces ──────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Surfaces"
          title="Ambient effects"
          hint="Use sparingly. Restraint rules shown below each sample."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card p-6 surface-noise relative overflow-hidden">
            <div className="brand-overline mb-2">Noise overlay</div>
            <p className="text-sm text-white/70 mb-2">Film grain at 3.5% opacity.</p>
            <p className="text-[10px] text-white/40">
              Only on: hero sections, empty states, auth screens.
              <br />Never on: data rows, dense UI.
            </p>
          </div>
          <div className="card p-6 aura-accent relative overflow-hidden">
            <div className="brand-overline mb-2">Accent aura</div>
            <p className="text-sm text-white/70 mb-2">Top-right radial bloom.</p>
            <p className="text-[10px] text-white/40">
              Max one aura per screen. Use on hero / primary panel only.
            </p>
          </div>
          <div className="card p-6 aura-info relative overflow-hidden">
            <div className="brand-overline mb-2">Info aura</div>
            <p className="text-sm text-white/70 mb-2">Same shape, blue tint.</p>
            <p className="text-[10px] text-white/40">
              Use for Apollo / data surfaces. Still max one per screen.
            </p>
          </div>
        </div>
      </section>

      {/* ── Empty states ──────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Patterns"
          title="Empty states"
          hint="One consistent shape across the app."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <EmptyState
            icon={<Inbox size={28} />}
            title="No sessions yet"
            body="Your logged sessions will appear here once you plan your first one."
            action={{ label: "Plan a session", onClick: () => {} }}
          />
          <EmptyState
            icon={<Target size={28} />}
            title="No proposals"
            body="Drill Scout hasn't found anything new in the last pass. Next heartbeat runs at 09:00 UTC."
            variant="compact"
          />
        </div>
      </section>

      {/* ── Skeleton loaders ──────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Patterns"
          title="Skeleton loaders"
          hint="Use these over spinners for content-area loads."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <div className="card p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      </section>

      {/* ── Cards + headings ──────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Patterns"
          title="Section heading"
          hint="SectionHeading for in-page groupings; PageHeader for page titles."
          action={<button className="btn btn-ghost text-xs">View all</button>}
        />
        <div className="card p-6">
          <p className="text-sm text-white/60">
            Heading above has: overline · title · hint · action. All props optional.
          </p>
        </div>
      </section>

      {/* ── Shadows ───────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading
          overline="Tokens"
          title="Shadows & glows"
          hint="Use for CTAs and elevated surfaces."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-6 text-center shadow-glow">
            <div className="text-xs text-white/60">shadow-glow</div>
          </div>
          <div className="card p-6 text-center shadow-glow-lg">
            <div className="text-xs text-white/60">shadow-glow-lg</div>
          </div>
          <div className="card p-6 text-center shadow-glow-info">
            <div className="text-xs text-white/60">shadow-glow-info</div>
          </div>
          <div className="card p-6 text-center shadow-glow-danger">
            <div className="text-xs text-white/60">shadow-glow-danger</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Swatch({ name, hex, dark = false }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div
        className="h-10 w-10 rounded-md border border-bg-border flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0">
        <div className={`text-xs font-semibold ${dark ? "text-white" : "text-white"}`}>{name}</div>
        <div className="text-[10px] text-white/40 font-mono">{hex}</div>
      </div>
    </div>
  );
}
