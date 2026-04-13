import {
  Bot,
  CheckCircle2,
  Clock,
  Key,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  APOLLO_APPROVAL_TIERS,
  APOLLO_DEPARTMENTS,
  APOLLO_FOUNDATION_STEPS,
  APOLLO_PRINCIPLES,
} from "../data/apollo";

const statusStyles = {
  Complete: "border-accent/30 bg-accent/10 text-accent",
  Existing: "border-accent/30 bg-accent/10 text-accent",
  Foundation: "border-electric/30 bg-electric/10 text-electric",
  "In progress": "border-accent/30 bg-accent/10 text-accent",
  Next: "border-electric/30 bg-electric/10 text-electric",
  Planned: "border-bg-border bg-bg-card2 text-white/55",
  Queued: "border-bg-border bg-bg-card2 text-white/55",
};

function StatusPill({ status }) {
  return (
    <span className={`tag border normal-case tracking-normal ${statusStyles[status] ?? statusStyles.Planned}`}>
      {status}
    </span>
  );
}

function CommandMetric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
        <Icon size={13} className="text-accent" />
        {label}
      </div>
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-white/45">{detail}</div>
    </div>
  );
}

export default function ApolloCommandCenter({
  pendingProposalCount = 0,
  customDrillCount = 0,
  memberCount = 0,
}) {
  return (
    <div className="space-y-5">
      <section className="academy-panel p-5 md:p-6">
        <div className="relative z-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <div className="brand-overline mb-3">
              <Sparkles size={13} />
              Apollo Command
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Commander online, autonomy locked.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
              Apollo is the command layer for GalGro's Academy. Every department reports upward,
              every risky action needs approval, and no agent gets to expand its own reach.
            </p>
          </div>
          <div className="rounded-lg border border-accent/15 bg-bg-soft/75 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-accent/80">
              <Shield size={13} />
              Current mode
            </div>
            <div className="font-display text-xl font-bold">Foundation only</div>
            <p className="mt-2 text-sm text-white/50">
              No background execution, no external tools, and no production changes are delegated yet.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CommandMetric
          icon={Shield}
          label="Control"
          value="Approval gated"
          detail="Apollo can coordinate, not bypass you."
        />
        <CommandMetric
          icon={Bot}
          label="Departments"
          value={APOLLO_DEPARTMENTS.length}
          detail="Security, Cyber, QA, Product, Performance, Drill Scout."
        />
        <CommandMetric
          icon={Key}
          label="Access"
          value="Server-side"
          detail="Future secrets stay outside the React app."
        />
        <CommandMetric
          icon={Clock}
          label="Heartbeat"
          value="Not armed"
          detail="Scheduled runs come after the runner is secured."
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            <h3 className="font-display font-bold">Apollo Charter</h3>
          </div>
          <div className="space-y-3">
            {APOLLO_PRINCIPLES.map((principle) => (
              <div key={principle.label} className="rounded-lg border border-bg-border bg-bg-soft p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{principle.label}</div>
                <div className="mt-1 text-sm font-semibold text-white/85">{principle.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot size={16} className="text-electric" />
            <h3 className="font-display font-bold">Departments</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {APOLLO_DEPARTMENTS.map((department) => (
              <div key={department.name} className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="font-bold text-sm">{department.name}</div>
                  <StatusPill status={department.status} />
                </div>
                <p className="text-xs leading-relaxed text-white/55">{department.scope}</p>
                <p className="mt-3 border-t border-bg-border pt-3 text-xs leading-relaxed text-white/40">{department.reports}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" />
            <h3 className="font-display font-bold">Approval Gates</h3>
          </div>
          <div className="space-y-3">
            {APOLLO_APPROVAL_TIERS.map((tier) => (
              <div key={tier.tier} className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-bold text-sm">{tier.tier}</div>
                  <span className="text-[11px] font-semibold text-accent/80">{tier.authority}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{tier.examples}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Zap size={16} className="text-orange" />
            <h3 className="font-display font-bold">Build Sequence</h3>
          </div>
          <div className="space-y-3">
            {APOLLO_FOUNDATION_STEPS.map((item) => (
              <div key={item.step} className="rounded-lg border border-bg-border bg-bg-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{item.step}</div>
                    <div className="mt-1 font-bold text-sm">{item.title}</div>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users size={16} className="text-electric" />
          <h3 className="font-display font-bold">Live Portal Context</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Members</div>
            <div className="mt-1 font-display text-2xl font-bold">{memberCount}</div>
          </div>
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Drill proposals</div>
            <div className="mt-1 font-display text-2xl font-bold">{pendingProposalCount}</div>
          </div>
          <div className="rounded-lg border border-bg-border bg-bg-soft p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">Custom drills</div>
            <div className="mt-1 font-display text-2xl font-bold">{customDrillCount}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
