import { createClient } from "@supabase/supabase-js";
import { generateObject, generateText, jsonSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildApolloContextPacks } from "./contextPacks.js";
import { getBudgetStatus, recordTokenUsage } from "./_tokens.js";
import { listActions } from "./actionExecutor.js";

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL
  ?? "https://gajcrvxyenxjqewuvkgw.supabase.co";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? "sb_publishable_-Sp_uIuA8o1I7nvp-aMxdQ_Y_OLNc1Y";

// Strip provider prefix if present (e.g. "openai/gpt-5-mini" -> "gpt-5-mini")
const APOLLO_MODEL = (process.env.APOLLO_MODEL ?? "gpt-5-mini").replace(/^openai\//, "");
const MODEL_ACCESS_CONFIGURED = Boolean(
  process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
);
const MAX_MESSAGE_LENGTH = 1200;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Authorization",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function makeSupabaseClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function accessExpired(profile) {
  if (!profile?.access_expires_on) return false;
  return profile.access_expires_on < new Date().toISOString().slice(0, 10);
}

function cleanMessage(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
}

function truncate(value = "", maxLength = 180) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

async function authorizeHeadCoach(request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { ok: false, status: 401, error: "Missing head-coach session." };
  }

  const supabase = makeSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,role,access_expires_on")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, status: 403, error: "Could not verify portal role." };
  }

  if (profile.role !== "head_coach" || accessExpired(profile)) {
    return { ok: false, status: 403, error: "Apollo chat is head-coach only." };
  }

  return {
    ok: true,
    accessToken,
    supabase,
    actor: {
      id: userData.user.id,
      name: profile.name ?? "Head Coach",
      role: profile.role,
      source: "supabase_session",
    },
  };
}

function latestFindings(context, predicate = () => true, limit = 5) {
  return context.runs
    .flatMap((run) => run.findings.map((finding) => ({ ...finding, runSummary: run.summary })))
    .filter(predicate)
    .slice(0, limit);
}

function formatFindingList(findings) {
  if (findings.length === 0) return "No matching findings are currently recorded.";
  return findings.map((finding) => (
    `- ${finding.agentName}: ${finding.title} (${finding.severity}). ${finding.recommendation}`
  )).join("\n");
}

function buildGroundedReply(message, context) {
  const lower = message.toLowerCase();
  const latestRun = context.runs[0];
  const counts = context.portalCounts
    .map((item) => `${item.tableName}: ${item.error ? "unavailable" : item.count}`)
    .join(", ");

  if (lower.includes("security") || lower.includes("cyber") || lower.includes("risk")) {
    const findings = latestFindings(
      context,
      (finding) => ["head_security", "head_cyber"].includes(finding.agentName?.toLowerCase().replace(/\s+/g, "_"))
        || ["head_of_security", "head_of_cyber"].includes(finding.agentName?.toLowerCase().replace(/\s+/g, "_"))
        || ["secrets", "runner", "scope", "permissions", "abuse_resistance"].includes(finding.category)
    );
    return `Security status from the recorded Apollo context:\n${formatFindingList(findings)}\n\nI would keep scheduled heartbeat locked until model auth, scheduled audit writes, runner secrets, and rate controls are approved.`;
  }

  if (lower.includes("next") || lower.includes("plan") || lower.includes("roadmap")) {
    return `Apollo Chat context packs and memory are active. My next recommendation is server-side model auth, then approval for a scheduled heartbeat.\n\nRoadmap:\n${context.roadmap.map((item) => `- ${item}`).join("\n")}`;
  }

  if (lower.includes("audit") || lower.includes("history") || lower.includes("record")) {
    return `Audit history is active. I can see ${context.runs.length} recent Apollo runs with ${context.totalFindings} findings and ${context.approvalFindings} approval-gated findings. Latest run: ${latestRun?.summary ?? "none yet"}.`;
  }

  return `I am online in grounded context-pack mode. I can see ${context.runs.length} recent Apollo audit runs, ${context.totalFindings} findings, and portal counts (${counts}). Context packs ready: ${context.summary.ready}; partial: ${context.summary.partial}. The safest next move is server-side model auth, then scheduled heartbeat approval.`;
}

function buildModelPrompt({ message, context, actor }) {
  return [
    `Head coach: ${actor.name}`,
    `Question: ${message}`,
    "Approved Apollo context packs:",
    JSON.stringify({
      version: context.version,
      generatedAt: context.generatedAt,
      summary: context.summary,
      packs: context.packs,
    }, null, 2),
  ].join("\n\n");
}

// 13L: the set of registry actions Apollo Chat is allowed to SUGGEST the
// head coach queue. Narrow allowlist by key, not by tier — being registered
// isn't automatic permission to be offered via chat. Observe-tier actions
// never appear here (they auto-run in the runner) and forbidden can't
// register in the first place.
const CHAT_SUGGESTABLE_KEYS = new Set([
  "memory.create",
  "access.revoke",
  "proposal.retire_stale",
]);

function buildSuggestableActionsForPrompt() {
  return listActions()
    .filter((a) => CHAT_SUGGESTABLE_KEYS.has(a.key))
    .map((a) => ({ key: a.key, label: a.label, tier: a.tier }));
}

// JSON schema the model fills in. Strict-ish: reply is required, suggestions
// and references are optional arrays. actionKey is constrained to the
// allowlist so the model literally cannot propose something off-menu.
const APOLLO_CHAT_RESPONSE_SCHEMA = jsonSchema({
  type: "object",
  additionalProperties: false,
  required: ["reply"],
  properties: {
    reply: {
      type: "string",
      description: "Plain-text answer for the head coach. Concise, operational, honest about gaps.",
    },
    suggestedActions: {
      type: "array",
      description: "Registry actions the head coach could queue for approval. Leave empty unless an action is clearly appropriate. NEVER queue an action yourself — only propose.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["actionKey", "label"],
        properties: {
          actionKey: {
            type: "string",
            enum: Array.from(CHAT_SUGGESTABLE_KEYS),
          },
          label: { type: "string", description: "Short human label for the suggestion chip." },
          reasoning: { type: "string", description: "Why this action is worth queuing." },
          payload: {
            type: "object",
            description: "Best-effort payload for the action (e.g. { profileId } for access.revoke, { title, body } for memory.create). Leave empty if you don't have the data from the context packs.",
            additionalProperties: true,
          },
        },
      },
    },
    referencedApprovalIds: {
      type: "array",
      description: "UUIDs of pending apollo_approvals the reply references (from the Approvals context pack). The UI will render approve/reject buttons for them.",
      items: { type: "string" },
    },
  },
});

// 13L: build the prompt for structured output. We stream the allowed
// suggestable actions into the prompt so the model sees their labels and
// tiers — the schema enforces the key allowlist, the prompt explains intent.
function buildStructuredPrompt({ message, context, actor }) {
  const suggestable = buildSuggestableActionsForPrompt();
  return [
    `Head coach: ${actor.name}`,
    `Question: ${message}`,
    "Approved Apollo context packs:",
    JSON.stringify({
      version: context.version,
      generatedAt: context.generatedAt,
      summary: context.summary,
      packs: context.packs,
    }, null, 2),
    "Registry actions you may SUGGEST (head coach still approves before anything runs):",
    JSON.stringify(suggestable, null, 2),
    "Rules for suggestedActions:",
    "- Only suggest when there is clear evidence in the context packs (or the head coach asked for it).",
    "- Payload fields should be sourced from the packs (e.g. profile IDs from the access pack, proposal IDs from the audit pack). If you don't have the data, leave payload empty — the head coach can fill it.",
    "- Never claim you queued anything. You can only suggest; queuing requires the head coach to click the chip.",
    "- For referencedApprovalIds, list pending approvals from the Approvals pack that your reply talks about (if any).",
  ].join("\n\n");
}

// 13L: defensive cleanup of model-proposed suggestions. Drops anything off
// the allowlist, truncates strings, coerces payload to an object. The
// queue-action endpoint also enforces these — this is belt + suspenders.
function sanitizeSuggestions(rawSuggestions) {
  if (!Array.isArray(rawSuggestions)) return [];
  return rawSuggestions
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      if (!CHAT_SUGGESTABLE_KEYS.has(raw.actionKey)) return null;
      return {
        actionKey: raw.actionKey,
        label: typeof raw.label === "string" ? raw.label.slice(0, 160) : raw.actionKey,
        reasoning: typeof raw.reasoning === "string" ? raw.reasoning.slice(0, 500) : "",
        payload: raw.payload && typeof raw.payload === "object" ? raw.payload : {},
      };
    })
    .filter(Boolean)
    .slice(0, 4); // cap at 4 per reply so the UI doesn't get spammy
}

// 13L: only keep UUID-ish approval IDs the model may reference. We'll
// re-fetch them server-side before responding to prove they're pending.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sanitizeReferencedIds(rawIds) {
  if (!Array.isArray(rawIds)) return [];
  return rawIds
    .filter((id) => typeof id === "string" && UUID_RE.test(id))
    .slice(0, 8);
}

async function hydrateReferencedApprovals(supabase, ids) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("apollo_approvals")
    .select("id,action_key,action_label,autonomy_tier,risk_level,status,action_payload,created_at")
    .in("id", ids)
    .eq("status", "pending");
  if (error || !Array.isArray(data)) return [];
  return data;
}

async function buildApolloReply({ message, context, actor, supabase }) {
  const fallback = buildGroundedReply(message, context);

  if (!MODEL_ACCESS_CONFIGURED) {
    return {
      mode: "grounded_fallback",
      model: null,
      reply: fallback,
      modelStatus: "No model auth is configured, so Apollo answered from deterministic context packs.",
      usage: null,
      budget: null,
      suggestedActions: [],
      referencedApprovals: [],
    };
  }

  // 13M-1: check the daily token budget BEFORE calling the model. If today's
  // usage already crossed the budget, fall back to grounded mode. The read is
  // best-effort — if it errors we still call the model (fail open).
  const budget = await getBudgetStatus(supabase);
  if (budget.exhausted) {
    return {
      mode: "grounded_budget_exhausted",
      model: APOLLO_MODEL,
      reply: fallback,
      modelStatus: `Daily token budget (${budget.budget}) reached; Apollo served a grounded reply. Resets at UTC midnight.`,
      usage: null,
      budget,
      suggestedActions: [],
      referencedApprovals: [],
    };
  }

  const systemPrompt = [
    "You are Apollo, the command layer for GalGro's Academy.",
    "Use only the approved context packs in the prompt. If the context does not support an answer, say what is missing.",
    "Treat partial context packs as imperfect evidence. Name the gap if it affects the recommendation.",
    "Be concise, operational, and honest. Do not claim background agents, model access, deployments, migrations, or live monitoring are active unless the context says so.",
    "Never reveal secrets. Never recommend destructive or third-party security testing. Keep scheduled/background autonomy locked unless audit, scope, cost, and approval controls are ready.",
    "You may propose registry actions via suggestedActions, but you NEVER execute or queue anything yourself — every action requires an explicit approval click from the head coach.",
  ].join(" ");

  try {
    const { object, usage } = await generateObject({
      model: openai(APOLLO_MODEL),
      schema: APOLLO_CHAT_RESPONSE_SCHEMA,
      system: systemPrompt,
      prompt: buildStructuredPrompt({ message, context, actor }),
    });

    // 13M-1: record usage after success. Swallow errors — serving the reply
    // matters more than perfect accounting.
    if (usage) {
      const record = await recordTokenUsage(supabase, { model: APOLLO_MODEL, usage });
      if (!record.ok) {
        console.warn("Apollo token usage record failed", record.error);
      }
    }

    const reply = typeof object?.reply === "string" && object.reply.trim()
      ? object.reply.trim()
      : fallback;
    const suggestedActions = sanitizeSuggestions(object?.suggestedActions);
    const referencedIds = sanitizeReferencedIds(object?.referencedApprovalIds);
    const referencedApprovals = await hydrateReferencedApprovals(supabase, referencedIds);

    return {
      mode: "model",
      model: APOLLO_MODEL,
      reply,
      modelStatus: "Model response generated through the server-side Apollo chat endpoint.",
      usage: usage ? {
        promptTokens: usage.promptTokens ?? 0,
        completionTokens: usage.completionTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
      } : null,
      budget,
      suggestedActions,
      referencedApprovals,
    };
  } catch (error) {
    console.error("Apollo model call failed", error);
    // 13L: if structured output choked, we try a plain text fallback so the
    // head coach still gets SOMETHING from the model. No action suggestions
    // on this path — we won't parse free text for actions.
    try {
      const { text, usage } = await generateText({
        model: openai(APOLLO_MODEL),
        system: systemPrompt,
        prompt: buildModelPrompt({ message, context, actor }),
      });
      if (usage) {
        const record = await recordTokenUsage(supabase, { model: APOLLO_MODEL, usage });
        if (!record.ok) console.warn("Apollo token usage record failed", record.error);
      }
      return {
        mode: "model_text_fallback",
        model: APOLLO_MODEL,
        reply: (text || "").trim() || fallback,
        modelStatus: "Structured output failed; served a plain text model response without action suggestions.",
        usage: usage ? {
          promptTokens: usage.promptTokens ?? 0,
          completionTokens: usage.completionTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        } : null,
        budget,
        suggestedActions: [],
        referencedApprovals: [],
      };
    } catch (textError) {
      console.error("Apollo text fallback also failed", textError);
      return {
        mode: "grounded_fallback",
        model: APOLLO_MODEL,
        reply: fallback,
        modelStatus: "Model call failed safely, so Apollo answered from deterministic context packs.",
        usage: null,
        budget,
        suggestedActions: [],
        referencedApprovals: [],
      };
    }
  }
}

async function recordChatAudit({ supabase, actor, message, reply, mode, model, context }) {
  const timestamp = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("apollo_agent_runs")
    .insert({
      agent_key: "apollo",
      agent_name: "Apollo",
      run_type: "manual",
      status: "completed",
      scope: "read_only",
      summary: `Apollo chat answered: ${truncate(message, 80)}`,
      started_at: timestamp,
      completed_at: timestamp,
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (runError) {
    console.error("Apollo chat audit run write failed", runError.message);
    return { status: "blocked", runId: null, message: "Apollo chat answered, but audit history could not record the exchange." };
  }

  const { error: findingError } = await supabase.from("apollo_findings").insert({
    run_id: run.id,
    agent_key: "apollo",
    title: "Apollo chat response",
    severity: "info",
    category: "chat",
    finding: truncate(message, 600),
    recommendation: truncate(reply, 1400),
    approval_required: false,
    metadata: {
      source: "apollo_chat",
      actorSource: actor.source,
      agentName: "Apollo",
      mode,
      model,
      contextPackVersion: context.version,
      contextPacks: context.summary.packs.map((pack) => ({
        key: pack.key,
        status: pack.status,
      })),
    },
  });

  if (findingError) {
    console.error("Apollo chat audit finding write failed", findingError.message);
    return { status: "partial", runId: run.id, message: "Chat run recorded, but the response finding could not be stored." };
  }

  return { status: "recorded", runId: run.id, message: "Apollo chat response recorded." };
}

async function handleChat(request) {
  const auth = await authorizeHeadCoach(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const payload = await readPayload(request);
  const message = cleanMessage(payload.message);
  if (!message) return json({ error: "Apollo needs a message to answer." }, 400);
  if (typeof payload.message === "string" && payload.message.length > MAX_MESSAGE_LENGTH) {
    return json({ error: `Apollo chat messages are limited to ${MAX_MESSAGE_LENGTH} characters.` }, 400);
  }

  const context = await buildApolloContextPacks({ supabase: auth.supabase, actor: auth.actor });
  const answer = await buildApolloReply({ message, context, actor: auth.actor, supabase: auth.supabase });
  const audit = await recordChatAudit({
    supabase: auth.supabase,
    actor: auth.actor,
    message,
    reply: answer.reply,
    mode: answer.mode,
    model: answer.model,
    context,
  });

  return json({
    status: "completed",
    reply: answer.reply,
    mode: answer.mode,
    model: answer.model,
    modelStatus: answer.modelStatus,
    // 13M-1: per-call usage + today's budget snapshot so the UI can warn the
    // head coach as they approach the ceiling.
    usage: answer.usage,
    budget: answer.budget,
    // 13L: structured outputs for the chat↔action bridge. UI renders
    // suggestedActions as clickable chips (click → queue a pending approval)
    // and referencedApprovals as inline approve/reject rows.
    suggestedActions: answer.suggestedActions ?? [],
    referencedApprovals: answer.referencedApprovals ?? [],
    audit,
    context: {
      version: context.version,
      generatedAt: context.generatedAt,
      summary: context.summary,
      packs: context.summary.packs,
      runCount: context.runs.length,
      findingCount: context.totalFindings,
      approvalFindingCount: context.approvalFindings,
    },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    try {
      return await handleChat(request);
    } catch (error) {
      console.error("Apollo chat failed", error);
      return json({ error: "Apollo chat failed safely." }, 500);
    }
  },
};
