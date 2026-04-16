export const APOLLO_PRINCIPLES = [
  {
    label: "Loyalty",
    value: "GalGro's Academy first, Gal in command.",
  },
  {
    label: "Authority",
    value: "All department agents report upward before action.",
  },
  {
    label: "Security",
    value: "No secrets in the browser. No silent privilege expansion.",
  },
  {
    label: "Accountability",
    value: "Every important action needs a finding, decision, and audit trail.",
  },
];

export const APOLLO_DEPARTMENTS = [
  {
    name: "Head of Security",
    status: "Foundation",
    scope: "Defensive review of auth, RLS, access, secrets, and deployment posture.",
    reports: "Blocks risky agent behavior and escalates approval needs to Apollo.",
  },
  {
    name: "Head of Cyber",
    status: "Foundation",
    scope: "Safe internal red-team thinking inside the approved app and repo perimeter.",
    reports: "Finds weaknesses without destructive tests, credential dumping, or third-party targeting.",
  },
  {
    name: "QA Lead",
    status: "Foundation",
    scope: "Checks builds, UI regressions, mobile layout, console errors, and critical flows.",
    reports: "Turns failures into clear reproduction notes and suggested fixes.",
  },
  {
    name: "Performance Lead",
    status: "Planned",
    scope: "Watches bundle weight, page speed, slow flows, and expensive client rendering.",
    reports: "Ranks optimizations by user impact and implementation risk.",
  },
  {
    name: "Product Lead",
    status: "Planned",
    scope: "Reviews portal workflow, keeper value, coach operations, and roadmap fit.",
    reports: "Separates useful product improvements from nice-to-have noise.",
  },
  {
    name: "Drill Scout",
    status: "Active",
    scope: "Proposal pipeline health, drill library coverage, and approval queue monitoring.",
    reports: "Surfaces pending proposals, pipeline age, and custom library coverage on every heartbeat.",
  },
];

export const APOLLO_APPROVAL_TIERS = [
  {
    tier: "Observe",
    authority: "Can run automatically",
    examples: "Read-only checks, status summaries, proposal ranking.",
  },
  {
    tier: "Recommend",
    authority: "Apollo can draft, Gal decides",
    examples: "Security fixes, UI changes, schema suggestions, roadmap edits.",
  },
  {
    tier: "Approval Required",
    authority: "Blocked until Gal approves",
    examples: "Database migrations, deploy changes, role/access changes, paid API runs.",
  },
  {
    tier: "Forbidden",
    authority: "Never allowed",
    examples: "Third-party attacks, destructive tests, credential dumping, secret exposure.",
  },
];

export const APOLLO_FOUNDATION_STEPS = [
  {
    step: "13A",
    title: "Command Foundation",
    status: "Complete",
    detail: "Charter, command center, approval model, and audit schema are in place.",
  },
  {
    step: "13B",
    title: "Server-side Runner",
    status: "Complete",
    detail: "Protected runner with audit persistence. Manual and scheduled runs both active.",
  },
  {
    step: "13C",
    title: "Department Agents",
    status: "Active",
    detail: "Security, Cyber, QA, and Drill Scout run live data-driven checks on every heartbeat.",
  },
  {
    step: "13D",
    title: "Apollo Chat",
    status: "Complete",
    detail: "Head-coach chat with server-built context packs, editable memory, and full audit trail.",
  },
  {
    step: "13E",
    title: "Model Access",
    status: "Complete",
    detail: "gpt-5-mini active via @ai-sdk/openai. OPENAI_API_KEY configured server-side only.",
  },
  {
    step: "13F",
    title: "Background Heartbeat",
    status: "Complete",
    detail: "Daily cron at 09:00 UTC. All gates armed: APOLLO_HEARTBEAT_ENABLED, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY.",
  },
];
