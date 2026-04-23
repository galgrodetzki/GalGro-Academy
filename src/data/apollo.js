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

// Status here is a *capability* label, not a real-time signal. The live
// per-agent health (did the most recent run complete or fail) is derived
// in ApolloCommandCenter from the sparkline data, not read from this file.
// Every agent below runs on every heartbeat via runDepartmentAgents.
export const APOLLO_DEPARTMENTS = [
  {
    name: "Head of Security",
    status: "Active",
    scope: "Defensive review of auth, RLS, access, secrets, and deployment posture.",
    reports: "Queues per-profile access.revoke approvals when expiry lapses and role stays stale.",
  },
  {
    name: "Head of Cyber",
    status: "Active",
    scope: "Safe internal red-team thinking inside the approved app and repo perimeter.",
    reports: "Probes key tables with an anon client (cyber.rls_audit) and escalates if RLS ever leaks.",
  },
  {
    name: "QA Lead",
    status: "Active",
    scope: "Checks data reachability, critical flow readiness, and stale proposal hygiene.",
    reports: "Queues proposal.retire_stale approvals for proposals older than a week.",
  },
  {
    name: "Performance Lead",
    status: "Active",
    scope: "Watches audit-table growth, finding backlog, and oversized session block arrays.",
    reports: "Warns when apollo_findings / apollo_agent_runs cross growth thresholds or sessions pass 20 blocks.",
  },
  {
    name: "Product Lead",
    status: "Active",
    scope: "Reviews portal workflow, roster activation, keeper engagement, and coach operations.",
    reports: "Flags abandoned draft sessions, dormant roster slots, mentor-message unread pileups, and un-prepped game days.",
  },
  {
    name: "Drill Scout",
    status: "Active",
    scope: "Proposal pipeline health, drill library coverage, and approval queue monitoring.",
    reports: "Auto-queues proposal.create via the observe lane when the pipeline runs dry.",
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

// Thematic build arc, not a commit-by-commit log. Each entry rolls up a group
// of related phases so the Build Sequence panel stays readable. When a new
// theme is worth calling out, add it here; when it's just another commit
// inside an existing theme, update the detail instead of appending.
export const APOLLO_FOUNDATION_STEPS = [
  {
    step: "13A–B",
    title: "Command Foundation",
    status: "Complete",
    detail: "Charter, command center, approval model, audit schema, and the protected server-side runner.",
  },
  {
    step: "13C",
    title: "Department Agents",
    status: "Active",
    detail: "All six agents — Security, Cyber, QA, Drill Scout, Perf, Product — run live checks every heartbeat.",
  },
  {
    step: "13D–E",
    title: "Apollo Chat",
    status: "Complete",
    detail: "Head-coach chat with context packs, editable memory, and server-only model access via AI Gateway.",
  },
  {
    step: "13F",
    title: "Background Heartbeat",
    status: "Complete",
    detail: "Daily cron at 09:00 UTC. APOLLO_HEARTBEAT_ENABLED, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY all armed.",
  },
  {
    step: "13G–K",
    title: "Action System",
    status: "Active",
    detail: "Registry with observe/recommend/approval tiers. Five agents queue real actions; lifecycle retry + undo + Cyber RLS probe shipped.",
  },
  {
    step: "13L",
    title: "Chat ↔ Action Bridge",
    status: "Complete",
    detail: "Apollo suggests actions inline; head coach clicks once to queue, once to approve. No back door.",
  },
  {
    step: "13M–O",
    title: "Observability & Hygiene",
    status: "Active",
    detail: "Daily token budget, cron visibility chip, weekly digest, click-to-resolve on open findings.",
  },
];
