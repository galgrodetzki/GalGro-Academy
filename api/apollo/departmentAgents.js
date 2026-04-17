const DEPARTMENT_AGENT_PROFILES = [
  {
    key: "head_security",
    name: "Head of Security",
    scope: "Auth, secrets, runner boundaries, and deployment posture.",
  },
  {
    key: "head_cyber",
    name: "Head of Cyber",
    scope: "Safe internal red-team review inside the approved app perimeter.",
  },
  {
    key: "qa_lead",
    name: "QA Lead",
    scope: "Critical flow readiness, data reachability, and release confidence.",
  },
  {
    key: "drill_scout",
    name: "Drill Scout",
    scope: "Proposal pipeline health, drill library coverage, and approval queue.",
  },
];

function finding({
  agent,
  title,
  severity = "info",
  category,
  detail,
  recommendation,
  approvalRequired = false,
  action = null,
}) {
  return {
    agentKey: agent.key,
    agentName: agent.name,
    title,
    severity,
    category,
    detail,
    recommendation,
    approvalRequired,
    // action: { key, payload } — optional. The runner reads this via
    // finding.metadata.actionKey after the finding is persisted, then:
    //   observe            → executeAction() runs immediately
    //   recommend / req    → an apollo_approvals row is queued for Gal
    //   forbidden / unknown → skipped, finding stays advisory
    action,
  };
}

async function safeCount(supabase, tableName) {
  if (!supabase) {
    return { tableName, count: null, error: "No read client is configured." };
  }
  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });
  return {
    tableName,
    count: count ?? null,
    error: error?.message ?? "",
  };
}

async function safeFetch(supabase, tableName, columns) {
  if (!supabase) {
    return { tableName, rows: [], error: "No read client is configured." };
  }
  const { data, error } = await supabase.from(tableName).select(columns);
  return {
    tableName,
    rows: data ?? [],
    error: error?.message ?? "",
  };
}

function runSecurityAgent(config, portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[0];
  const today = new Date().toISOString().slice(0, 10);
  const auditWriteAvailable = config.serviceRoleConfigured || config.manualAuditAvailable;
  const findings = [];

  findings.push(finding({
    agent,
    title: "Runner is still approval-gated",
    category: "control",
    detail: "Department agents are running inside Apollo's read-only runner. They cannot deploy, migrate, change access, or call external tools.",
    recommendation: "Keep this boundary until approval records and per-agent scopes are fully wired.",
  }));

  findings.push(finding({
    agent,
    title: auditWriteAvailable ? "Audit authorization path is available" : "Audit write path is not configured",
    severity: auditWriteAvailable ? "info" : "medium",
    category: "secrets",
    detail: config.serviceRoleConfigured
      ? "SUPABASE_SERVICE_ROLE_KEY is available only to the server runner."
      : config.manualAuditAvailable
        ? "Manual Apollo runs can use the current head-coach session to attempt audit writes through RLS."
        : "Apollo cannot persist scheduled department runs until the Supabase service-role key is added in Vercel.",
    recommendation: config.serviceRoleConfigured
      ? "Use the service-role key only for narrow Apollo audit writes."
      : config.manualAuditAvailable
        ? "Keep manual audit writes behind the head-coach session until scheduled runs are approved."
        : "Add SUPABASE_SERVICE_ROLE_KEY only after supabase/apollo_foundation.sql has been applied.",
    approvalRequired: !auditWriteAvailable,
  }));

  // Data check: expired but not revoked profiles
  if (portalData.profiles.rows.length > 0) {
    const expiredActive = portalData.profiles.rows.filter(
      (p) => p.access_expires_on && p.access_expires_on < today && p.role !== "revoked"
    );
    if (expiredActive.length > 0) {
      // One finding per profile — each gets its own approval card so Gal can
      // decide profile-by-profile. Tier is approval_required on the action.
      for (const profile of expiredActive) {
        const label = profile.name || profile.id;
        findings.push(finding({
          agent,
          title: `Revoke access: ${label}`,
          severity: "medium",
          category: "access",
          detail: `Profile "${label}" (role: ${profile.role}) expired on ${profile.access_expires_on}. RLS already blocks their DB access — this action makes the role label consistent by setting role = "revoked".`,
          recommendation: "Approve to flip the role, reject to keep the current label (e.g. if expiry will be extended instead).",
          approvalRequired: true,
          action: {
            key: "access.revoke",
            payload: { profileId: profile.id, profileName: label },
          },
        }));
      }
    } else {
      findings.push(finding({
        agent,
        title: "No expired profiles with stale active roles",
        category: "access",
        detail: "All profiles with expiry dates have either valid future dates or revoked roles.",
        recommendation: "Check expiry dates periodically as training seasons change.",
      }));
    }

    // Data check: non-coach profiles with no expiry set
    const noExpiry = portalData.profiles.rows.filter(
      (p) => !p.access_expires_on && p.role !== "head_coach" && p.role !== "revoked"
    );
    if (noExpiry.length > 0) {
      findings.push(finding({
        agent,
        title: `${noExpiry.length} non-coach profile${noExpiry.length > 1 ? "s have" : " has"} no expiry date`,
        severity: "low",
        category: "access",
        detail: `${noExpiry.length} profile(s) (assistants, keepers, or viewers) have no access_expires_on set, giving indefinite portal access.`,
        recommendation: "Consider setting expiry dates for non-coach accounts in Admin → Access.",
      }));
    }
  }

  if (config.modelAccessConfigured) {
    findings.push(finding({
      agent,
      title: "Model access is configured and active",
      category: "model_access",
      detail: "OPENAI_API_KEY is configured server-side. Model-backed Apollo Chat is active via @ai-sdk/openai.",
      recommendation: "Keep model calls server-side only. Monitor usage costs periodically.",
    }));
  }

  return findings;
}

function runCyberAgent(config, portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[1];
  const findings = [];

  findings.push(finding({
    agent,
    title: "Cyber scope is defensive only",
    category: "scope",
    detail: "The Cyber agent is limited to internal posture review. No third-party targeting, credential dumping, destructive tests, or denial-of-service behavior exists in this runner.",
    recommendation: "Keep offensive test categories forbidden unless Gal approves a narrow, legal, internal test plan.",
  }));

  findings.push(finding({
    agent,
    title: "No autonomous escalation channel found",
    category: "permissions",
    detail: "Department agents can report findings, but they do not create new permissions, roles, secrets, deployments, or model calls.",
    recommendation: "Preserve this rule as more departments are added.",
  }));

  // Data check: unlinked players
  if (portalData.players.rows.length > 0) {
    const unlinked = portalData.players.rows.filter((p) => !p.profile_id);
    if (unlinked.length > 0) {
      const names = unlinked.map((p) => p.name).join(", ");
      findings.push(finding({
        agent,
        title: `${unlinked.length} player${unlinked.length > 1 ? "s are" : " is"} not linked to a keeper account`,
        severity: "low",
        category: "data_integrity",
        detail: `Player(s) without a linked profile_id: ${names}. These players cannot log in, write session reflections, or see their own training data in the Keeper Portal.`,
        recommendation: "Link keeper accounts via Admin → Players → Edit Player when those keepers are ready to use the portal.",
      }));
    } else {
      findings.push(finding({
        agent,
        title: "All players are linked to keeper accounts",
        category: "data_integrity",
        detail: "Every player in the roster has a profile_id linking them to a keeper login.",
        recommendation: "Verify links remain valid if a keeper account is revoked or a player is removed.",
      }));
    }
  }

  findings.push(finding({
    agent,
    title: config.runnerSecretConfigured ? "Cron auth is in place" : "No cron auth configured",
    severity: config.runnerSecretConfigured ? "info" : "low",
    category: "abuse_resistance",
    detail: config.runnerSecretConfigured
      ? "CRON_SECRET is configured. Vercel sends it automatically with scheduled requests."
      : "No runner secret is configured — scheduled heartbeat would be unauthenticated.",
    recommendation: config.runnerSecretConfigured
      ? "Keep cron frequency low (daily max) to limit blast radius."
      : "Add CRON_SECRET before enabling any scheduled heartbeat.",
  }));

  // 13K: Cyber's first action. Observe-tier probe of sensitive tables using an
  // unauthenticated client. The action handler updates this finding in place:
  //   leaked → critical + open     (visible in Inbox as an incident)
  //   open_empty → medium + open   (RLS is too loose even though empty today)
  //   all blocked → auto-resolved  (audit trail stays clean on repeat runs)
  // The initial finding lands as "info" because we don't know the state until
  // the probe runs. The runner's observe lane executes it immediately.
  findings.push(finding({
    agent,
    title: "RLS baseline audit (anon client)",
    severity: "info",
    category: "rls_audit",
    detail: "Apollo will probe key tables with an anonymous Supabase client and update this finding based on what comes back.",
    recommendation: "If this finding escalates to critical, review RLS policies on the listed tables immediately.",
    action: {
      key: "cyber.rls_audit",
      payload: { tables: ["profiles", "players", "sessions", "agent_proposals"] },
    },
  }));

  return findings;
}

function runQaAgent(config, portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[2];
  const today = new Date().toISOString().slice(0, 10);
  const STALE_DAYS = 7;
  const findings = [];

  const dataChecks = [portalData.profiles, portalData.players, portalData.sessions, portalData.proposals];
  const failed = dataChecks.filter((d) => d.error);
  const reached = dataChecks.filter((d) => !d.error);

  findings.push(finding({
    agent,
    title: failed.length ? "Some Supabase reads need attention" : "Supabase read path is reachable",
    severity: failed.length ? "medium" : "info",
    category: "data",
    detail: failed.length
      ? `Could not read: ${failed.map((d) => d.tableName).join(", ")}.`
      : `Read checks reached: ${reached.map((d) => d.tableName).join(", ")}.`,
    recommendation: failed.length
      ? "Check RLS policies and environment configuration before trusting scheduled QA runs."
      : "Keep these read checks as the baseline for future QA heartbeat runs.",
    approvalRequired: failed.length > 0,
  }));

  // Session gap check
  const sessionCount = portalData.sessions.count ?? 0;
  if (sessionCount === 0) {
    findings.push(finding({
      agent,
      title: "No sessions have been created yet",
      severity: "low",
      category: "portal_usage",
      detail: "The session builder and drill library are active, but zero sessions have been saved. The full coaching loop (session → attendance → reflection → Apollo analysis) cannot run until the first session is created.",
      recommendation: "Create the first session in the builder when ready. Assign players and use one of the approved custom drills.",
    }));
  } else {
    findings.push(finding({
      agent,
      title: `${sessionCount} session${sessionCount > 1 ? "s" : ""} recorded`,
      category: "portal_usage",
      detail: `${sessionCount} session(s) exist in the portal.`,
      recommendation: "Keep sessions up to date. Check keeper reflections after completed sessions.",
    }));
  }

  // Stale pending proposals — one finding per proposal so each gets its own
  // approval card. Action is recommend-tier: reversible cleanup that still
  // deserves a conscious "yes".
  if (portalData.proposals.rows.length > 0) {
    const stale = portalData.proposals.rows.filter((p) => {
      if (p.status !== "pending") return false;
      const daysOld = Math.floor(
        (new Date(today) - new Date(p.created_at)) / (1000 * 60 * 60 * 24)
      );
      return daysOld > STALE_DAYS;
    });
    for (const proposal of stale) {
      const daysOld = Math.floor(
        (new Date(today) - new Date(proposal.created_at)) / (1000 * 60 * 60 * 24)
      );
      findings.push(finding({
        agent,
        title: `Retire stale proposal: ${proposal.name}`,
        severity: "low",
        category: "portal_usage",
        detail: `"${proposal.name}" has been pending for ${daysOld} days (threshold: ${STALE_DAYS}). Retiring it clears the Agent Inbox — Drill Scout may re-propose a similar drill if the category is still thin.`,
        recommendation: "Approve to reject this proposal, or reject this approval to keep it pending for manual review.",
        action: {
          key: "proposal.retire_stale",
          payload: { proposalId: proposal.id, proposalName: proposal.name },
        },
      }));
    }
  }

  if (!config.serviceRoleConfigured) {
    findings.push(finding({
      agent,
      title: config.manualAuditAvailable ? "Scheduled audit verification is blocked" : "Audit verification is blocked",
      severity: config.manualAuditAvailable ? "low" : "medium",
      category: "audit",
      detail: config.manualAuditAvailable
        ? "Manual reviews can be recorded through the head-coach session, but scheduled reviews still need a server-only service-role key."
        : "The QA agent cannot confirm persistent department-agent history until an audit write path is configured.",
      recommendation: config.manualAuditAvailable
        ? "Keep scheduled heartbeat locked until the service-role key and runner secret are approved."
        : "Apply the Apollo SQL and add the Vercel service-role environment variable when ready to activate audit history.",
      approvalRequired: !config.manualAuditAvailable,
    }));
  }

  return findings;
}

// ── Drill Scout proposal catalog ──────────────────────────────────────────
// Hand-curated GK drills. DrillScout rotates through these, picking from
// categories under-represented in the custom library. Every entry includes
// a video_url so approved drills surface the YouTube button immediately.

const DRILL_SCOUT_CATALOG = [
  {
    name: "Back-to-Goal Reaction Save",
    category: "reflexes",
    duration: 12,
    intensity: "High",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves",
    description: "Keeper faces away from goal. Server calls 'turn' and fires a shot immediately. Keeper spins and saves. Focus on quick pivot and hand position as you turn.",
    objectives: ["Train turn-and-save reflex", "Improve reaction to unexpected shots", "Build scanning habit"],
    coaching_points: ["Spin on the balls of your feet — don't cross your legs", "Hands up before you've fully turned", "Eyes on the ball the moment you rotate"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+back+to+goal+reaction+save+drill",
    agent_notes: "High-value reflex drill. Simulates a deflection or rebound where keeper has lost sightline.",
  },
  {
    name: "Keeper vs Keeper Shootout",
    category: "shot-stopping",
    duration: 15,
    intensity: "High",
    players: "2 keepers",
    equipment: "Balls, GK Gloves, 2 mini goals",
    description: "Two keepers face each other with mini goals 12 yards apart. Take turns shooting from where you stand — no dribbling. First to 5 wins. Loser does 10 press-ups.",
    objectives: ["Competitive shot-stopping under pressure", "Shooting accuracy for keepers", "Game-speed reactions"],
    coaching_points: ["Pick your corner — aim before you kick", "Stay on your feet until the last moment", "Reset quickly after each save"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+vs+goalkeeper+shootout+training+drill",
    agent_notes: "Competitive format increases intensity and sharpens decision-making under pressure.",
  },
  {
    name: "Diving Header Claim",
    category: "crosses",
    duration: 10,
    intensity: "High",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves",
    description: "Server delivers a dropping ball from the side. Keeper comes off the line and claims it at the highest point with a diving header technique — but catches it, doesn't head it. All about timing the run.",
    objectives: ["Time the run to meet a dropping cross", "Attack the ball at the highest point", "Maintain strong body shape mid-air"],
    coaching_points: ["Commit to the cross early — don't hesitate", "Lead with your hands, not your head", "Call 'keeper!' before you leave your line"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+diving+cross+claim+timing+drill",
    agent_notes: "Targets the gap between crosses and corners — ball that drops behind the initial line.",
  },
  {
    name: "Low Driven Cross + Striker Deflection",
    category: "crosses",
    duration: 12,
    intensity: "High",
    players: "1 keeper · 1 server · 1 coach acting as striker",
    equipment: "Balls, GK Gloves, Cones",
    description: "Server drives a low cross along the ground from wide. A second player at the near post deflects or misses it. Keeper must react to the deflection and stop the ball reaching the far post.",
    objectives: ["React to low driven crosses", "Read deflection paths", "Protect the far post"],
    coaching_points: ["Stay off your line for low crosses — be ready to move", "Watch the ball through the deflecting player", "Push off early if it clears the near post"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+low+cross+near+post+deflection+save",
    agent_notes: "One of the most common goal sources. The near-post deflection is frequently unaddressed in training.",
  },
  {
    name: "Distribution Under Pressure",
    category: "distribution",
    duration: 12,
    intensity: "Medium",
    players: "1 keeper · 2 servers",
    equipment: "Balls, GK Gloves, Cones",
    description: "Two servers close in from midfield after keeper makes a save. Keeper has 3 seconds to distribute to a target cone 30+ yards away before servers arrive. Simulate match pressure on the ball.",
    objectives: ["Distribute quickly under time pressure", "Choose the right distribution type", "Scan before receiving the ball back"],
    coaching_points: ["Decide before the ball reaches you", "Pick your head up the moment you catch it", "Drop-kick, throw, or kick — don't take extra touches"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+distribution+under+pressure+quick+release",
    agent_notes: "Bridges shot-stopping and distribution. Forces decision-making at game speed.",
  },
  {
    name: "Chip Shot Recovery",
    category: "positioning",
    duration: 10,
    intensity: "High",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves",
    description: "Keeper is positioned at edge of box (acting as sweeper-keeper). Server chips from 25 yards. Keeper must read the flight, sprint back, and either catch or tip over the crossbar.",
    objectives: ["Read early chip shot flight", "Sprint recovery to goal line", "Tip over or catch at full stretch"],
    coaching_points: ["Open body shape when high — read the flight immediately", "Don't backpedal — turn and sprint", "Hands up early as you arrive"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+chip+shot+recovery+sprint+tip+over+bar",
    agent_notes: "Essential for any keeper who plays a high defensive line.",
  },
  {
    name: "Short-Corner Set Play",
    category: "set-pieces",
    duration: 12,
    intensity: "Medium",
    players: "1 keeper · 2 servers",
    equipment: "Balls, GK Gloves, Cones",
    description: "Corner is played short to a teammate who lays it back for a late-arriving shot from the D. Keeper must reset position from corner stance to face a driven shot from 20 yards.",
    objectives: ["Recognise and react to short corner play", "Reset body position mid-sequence", "Deal with driven shot after reposition"],
    coaching_points: ["Watch the corner-taker, not just the ball in the box", "Move early when short — don't freeze", "Get set before the shot comes"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+short+corner+set+play+drill",
    agent_notes: "Short corners catch keepers off-guard. Practice the positional reset under time pressure.",
  },
  {
    name: "One-Handed Extension Save",
    category: "diving",
    duration: 10,
    intensity: "High",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves",
    description: "Server fires balls at full stretch pace — just out of two-handed reach. Keeper must extend one arm fully and tip or parry to safety. Done from both sides.",
    objectives: ["Develop one-handed save technique", "Improve full-body extension", "Parry to safety, not back to danger"],
    coaching_points: ["Lead with the outside hand — don't reach across your body", "Push the ball wide, not central", "Landing: side, then hip, then roll"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+one+handed+extension+tip+save+drill",
    agent_notes: "The last line of defence when two hands won't reach. Critical for top-corner saves.",
  },
  {
    name: "Communication: Press Trigger Call",
    category: "communication",
    duration: 10,
    intensity: "Medium",
    players: "1 keeper · 4 outfield players (use cones if needed)",
    equipment: "Balls, Cones",
    description: "Coach plays into a target player. Keeper decides when to call 'press' based on the quality of the touch. Defenders react to keeper's call. Focus on timing and clarity of the trigger call.",
    objectives: ["Learn when to trigger a press", "Develop commanding, clear vocal cues", "Coordinate the press with defenders"],
    coaching_points: ["Call 'press' only when the touch is heavy or the player turns away", "Be loud — make it unmistakable", "If in doubt, hold the line"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+press+trigger+communication+training",
    agent_notes: "The press-trigger call is one of the most impactful things a keeper does without touching the ball.",
  },
  {
    name: "Collapse + Immediate Recovery",
    category: "diving",
    duration: 12,
    intensity: "High",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves",
    description: "Server fires low to one side. Keeper collapses to save. Immediately rolls to feet and faces a second shot to the other side within 2 seconds. No break between the save and the follow-up.",
    objectives: ["Fast recovery from ground after save", "Maintain focus and body position after effort", "Two consecutive saves without reset time"],
    coaching_points: ["Don't stay on the ground — roll to feet immediately", "Eyes stay on the server through the roll", "Don't relax after the first save"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+collapse+dive+immediate+recovery+second+save",
    agent_notes: "Rebound saves are a major goal source. Recovery speed after the first save is the skill.",
  },
  {
    name: "Penalty Saving Strategy Session",
    category: "set-pieces",
    duration: 15,
    intensity: "Medium",
    players: "1 keeper · multiple penalty takers",
    equipment: "Balls, GK Gloves",
    description: "Systematic penalty-saving practice. Keeper picks a side before each run-up and commits. Then tries to read the taker's body shape and stance. Alternate between committed dive and reactive save.",
    objectives: ["Build a penalty-saving strategy", "Read the taker's body shape and standing foot", "Commit to a decision without hesitation"],
    coaching_points: ["Pick a side on hard kicks — you won't react in time", "Look at the standing foot and hip angle, not the eyes", "Once committed, don't change"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+penalty+saving+strategy+read+taker",
    agent_notes: "Most penalty drills are mechanical. This one focuses on the decision-making process.",
  },
  {
    name: "High-Ball Footwork Circuit",
    category: "footwork",
    duration: 10,
    intensity: "Medium",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves, Agility Ladder",
    description: "Keeper completes a 5-cone ladder pattern, then immediately turns to claim a high ball delivered by the server. No pause between the footwork and the claim. Forces coordination under movement.",
    objectives: ["Combine footwork with ball claim", "Maintain handling quality after physical effort", "Transition quickly from movement to set position"],
    coaching_points: ["Complete the ladder clean — don't rush it", "Turn with purpose, not panic", "Hands up before the ball arrives"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+footwork+ladder+to+high+ball+claim+drill",
    agent_notes: "Bridges the gap between footwork drills and live ball work. Game-realistic.",
  },
  {
    name: "Six-Yard Box Scramble",
    category: "shot-stopping",
    duration: 10,
    intensity: "High",
    players: "1 keeper · 2 servers",
    equipment: "Balls, GK Gloves",
    description: "Two servers stand either side of the 6-yard box. They alternate firing low shots from close range. Keeper cannot set — they must save from whatever position they're in after the previous shot.",
    objectives: ["Handle multiple close-range threats", "Save without full body position", "Keep the ball out when off-balance"],
    coaching_points: ["Don't wait to be set — react from where you are", "Instinct saves: arms, legs, whatever blocks the ball", "Be loud — make yourself big"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+six+yard+box+scramble+close+range+drill",
    agent_notes: "Replicates the chaos of a goalmouth scramble. Very few GKs train this specifically.",
  },
  {
    name: "Footwork and Shot Angles Combo",
    category: "positioning",
    duration: 12,
    intensity: "Medium",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves, Cones",
    description: "Cones mark four shooting positions around the box. Server passes to each in sequence. Keeper must re-angle before each shot, setting position from the correct spot for each cone location.",
    objectives: ["Re-angle efficiently between shooting positions", "Maintain correct set stance at each position", "Handle driven shots immediately after moving"],
    coaching_points: ["Shuffle — don't sprint — between positions", "Set before the ball leaves the server's foot", "Always face the ball, not the cone"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+positioning+footwork+angle+drill+cones",
    agent_notes: "A great bridge between isolated footwork and live positioning work.",
  },
  {
    name: "Full Stretch Aerial Tip",
    category: "shot-stopping",
    duration: 10,
    intensity: "High",
    players: "1 keeper · 1 server",
    equipment: "Balls, GK Gloves",
    description: "Server stands 10 yards out and delivers balls to the top corners — curling shots, not flat. Keeper must tip the ball over the bar or around the post. Focus on getting full extension with one hand.",
    objectives: ["Tip top-corner shots to safety", "Full-body extension with clean hand contact", "Make good decisions: tip over or wide?"],
    coaching_points: ["Open the palm — don't claw at it", "Tip over the bar if going straight — tip around the post if going wide", "Stay on your feet as long as possible"],
    video_url: "https://www.youtube.com/results?search_query=goalkeeper+top+corner+tip+over+bar+extension+save",
    agent_notes: "Top-corner tip-overs are aesthetically strong and technically demanding. Worth repeating often.",
  },
];

// Pick drills to propose: rotate by date so each daily run proposes different ones,
// and skip any that are already pending or already match an existing proposal name.
function selectProposalsToSubmit(existingProposals, count = 2) {
  const existingNames = new Set(existingProposals.map((p) => p.name.toLowerCase()));
  const available = DRILL_SCOUT_CATALOG.filter(
    (d) => !existingNames.has(d.name.toLowerCase())
  );
  if (available.length === 0) return [];

  // Deterministic daily rotation: use ISO date as seed offset
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const startIdx = (dayOfYear * 3) % available.length;

  const picks = [];
  for (let i = 0; i < available.length && picks.length < count; i++) {
    picks.push(available[(startIdx + i) % available.length]);
  }
  return picks;
}

function runDrillScoutAgent(portalData) {
  const agent = DEPARTMENT_AGENT_PROFILES[3];
  const today = new Date().toISOString().slice(0, 10);
  const findings = [];

  const proposals = portalData.proposals.rows;
  if (proposals.length === 0 && portalData.proposals.error) {
    findings.push(finding({
      agent,
      title: "Proposal data unavailable",
      severity: "low",
      category: "pipeline",
      detail: "Could not read agent_proposals table. Pipeline health cannot be assessed.",
      recommendation: "Check RLS and service-role key configuration.",
    }));
    return findings;
  }

  const pending  = proposals.filter((p) => p.status === "pending");
  const approved = proposals.filter((p) => p.status === "approved");
  const rejected = proposals.filter((p) => p.status === "rejected");

  // ── Queue new proposals when pipeline is dry ──────────────────────────────
  // 13H: DrillScout no longer inserts directly. Each selected drill becomes
  // a finding with an observe-tier `proposal.create` action — the action
  // executor handles the insert inside the audit loop, keeping all side
  // effects in one place and audit-visible.
  const shouldQueue = pending.length < 3 && approved.length < 20;
  const queuedNames = [];

  if (shouldQueue) {
    const picks = selectProposalsToSubmit(proposals, pending.length === 0 ? 3 : 2);
    for (const drill of picks) {
      queuedNames.push(drill.name);
      findings.push(finding({
        agent,
        title: `Queue proposal: ${drill.name}`,
        severity: "info",
        category: "pipeline",
        detail: `Proposing "${drill.name}" (${drill.category}, ${drill.duration}m, ${drill.intensity} intensity). The drill will land in Admin → Agent Inbox as pending for your review.`,
        recommendation: `${drill.agent_notes ?? "DrillScout selected this to diversify the library."}`,
        action: {
          key: "proposal.create",
          payload: { drill },
        },
      }));
    }
  }

  // ── Findings ──────────────────────────────────────────────────────────────

  // Pipeline overview (reflects proposals queued for insertion this run)
  const totalPending = pending.length + queuedNames.length;
  findings.push(finding({
    agent,
    title: `Drill pipeline: ${proposals.length + queuedNames.length} total — ${totalPending} pending, ${approved.length} approved, ${rejected.length} rejected`,
    severity: totalPending > 5 ? "low" : "info",
    category: "pipeline",
    detail: queuedNames.length > 0
      ? `Queuing ${queuedNames.length} new proposal${queuedNames.length !== 1 ? "s" : ""}: ${queuedNames.join(", ")}. Each will land in Admin → Agent Inbox after this run completes.`
      : totalPending > 0
        ? `Proposals awaiting review: ${pending.map((p) => p.name).join(", ")}.`
        : `No pending proposals. ${approved.length} approved drill${approved.length !== 1 ? "s" : ""} in the custom library.`,
    recommendation: totalPending > 0
      ? "Review pending proposals in Admin → Agent Inbox. Each drill includes a YouTube link and is ready to approve."
      : "Drill library is well-stocked. Focus on using drills in sessions.",
  }));

  // Age of oldest pending proposal
  if (pending.length > 0) {
    const oldest = pending.reduce((a, b) => (a.created_at < b.created_at ? a : b));
    const daysOld = Math.floor(
      (new Date(today) - new Date(oldest.created_at)) / (1000 * 60 * 60 * 24)
    );
    if (daysOld > 3) {
      findings.push(finding({
        agent,
        title: `Oldest pending proposal is ${daysOld} day${daysOld !== 1 ? "s" : ""} old`,
        severity: daysOld > 14 ? "medium" : "low",
        category: "pipeline_age",
        detail: `"${oldest.name}" has been in the inbox for ${daysOld} days without a decision.`,
        recommendation: "A quick approve/reject keeps the pipeline healthy and helps the Drill Scout learn what you want.",
      }));
    }
  }

  // Custom library size
  findings.push(finding({
    agent,
    title: `Custom library has ${approved.length} approved drill${approved.length !== 1 ? "s" : ""}`,
    category: "library",
    detail: approved.length === 0
      ? "No custom drills approved yet. The session builder only has the static drill library."
      : `${approved.length} custom drill(s) available in the session builder alongside the static library.`,
    recommendation: approved.length < 5
      ? "Approve more proposals to build a library that reflects your coaching style."
      : "Good coverage. Review coaching points on existing drills and add session notes when you use them.",
  }));

  return findings;
}

export async function runDepartmentAgents({ supabase, config }) {
  // Fetch live portal data for all agents in parallel
  const [profiles, players, proposals] = await Promise.all([
    safeFetch(supabase, "profiles", "id, name, role, access_expires_on"),
    safeFetch(supabase, "players", "id, name, profile_id"),
    safeFetch(supabase, "agent_proposals", "id, name, status, created_at"),
  ]);
  const sessionsCount = await safeCount(supabase, "sessions");
  const sessions = { ...sessionsCount, rows: [] };

  const portalData = { profiles, players, sessions, proposals };

  const tableChecks = [
    { tableName: "profiles", count: profiles.rows.length, error: profiles.error },
    { tableName: "players", count: players.rows.length, error: players.error },
    { tableName: "sessions", count: sessionsCount.count, error: sessionsCount.error },
    { tableName: "agent_proposals", count: proposals.rows.length, error: proposals.error },
  ];

  const findings = [
    ...runSecurityAgent(config, portalData),
    ...runCyberAgent(config, portalData),
    ...runQaAgent(config, portalData),
    // DrillScout is now synchronous — its side effects go through the
    // action executor via the observe-tier `proposal.create` action.
    ...runDrillScoutAgent(portalData),
  ];

  return {
    agents: DEPARTMENT_AGENT_PROFILES,
    tableChecks,
    findings,
  };
}
