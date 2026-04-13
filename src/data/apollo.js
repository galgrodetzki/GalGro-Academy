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
    status: "Existing",
    scope: "Proposes goalkeeper-only drills for coach review.",
    reports: "Feeds the existing Agent Inbox. Apollo will eventually supervise this queue.",
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
    detail: "Charter, command center, approval model, and audit schema draft are in place.",
  },
  {
    step: "13B",
    title: "Server-side Runner",
    status: "Foundation",
    detail: "Protected manual runner exists. Secrets, model access, and scheduled runs remain locked until approved.",
  },
  {
    step: "13C",
    title: "Department Agents",
    status: "Foundation",
    detail: "Security, Cyber, and QA now report through Apollo in read-only mode.",
  },
  {
    step: "13D",
    title: "Background Heartbeat",
    status: "Next",
    detail: "Scheduled and event-triggered runs with cost, frequency, and scope controls.",
  },
];
