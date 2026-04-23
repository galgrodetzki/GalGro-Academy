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

// Ordered chronologically. Each entry is a real shipped phase — don't add
// one until it's committed to main. Keep `detail` tight (≈ one sentence) so
// the Build Sequence panel stays readable.
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
    detail: "All six agents (Security, Cyber, QA, Drill Scout, Perf, Product) run live checks every heartbeat.",
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
    detail: "Server-side model path armed via AI Gateway. No credentials in the browser bundle.",
  },
  {
    step: "13F",
    title: "Background Heartbeat",
    status: "Complete",
    detail: "Daily cron at 09:00 UTC. All gates armed: APOLLO_HEARTBEAT_ENABLED, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY.",
  },
  {
    step: "13G–H",
    title: "Action System",
    status: "Complete",
    detail: "Action registry with observe/recommend/approval tiers. Security, QA, and Drill Scout queue real actions.",
  },
  {
    step: "13J",
    title: "Approval Lifecycle",
    status: "Complete",
    detail: "Retry for failed executions, execution_result surfacing, and undo for access.revoke.",
  },
  {
    step: "13K",
    title: "Cyber Action",
    status: "Complete",
    detail: "cyber.rls_audit probes key tables with an anon client every heartbeat.",
  },
  {
    step: "13L",
    title: "Chat ↔ Action Bridge",
    status: "Complete",
    detail: "Apollo suggests actions inline; head coach still clicks once to queue, once to approve.",
  },
  {
    step: "13M",
    title: "Observability & Budget",
    status: "Complete",
    detail: "Daily token counter + optional budget, last-cron chip, weekly digest memory entries.",
  },
  {
    step: "13N",
    title: "Full Roster Online",
    status: "Active",
    detail: "Perf Lead + Product Lead shipping findings. Status chips derived from sparkline data, not labels.",
  },
];
