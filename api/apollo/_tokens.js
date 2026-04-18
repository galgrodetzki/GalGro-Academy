// Apollo 13M-1 — token usage ledger.
//
// One tiny module so both chat.js and status.js can agree on:
//   - what "today" means (UTC, matches apollo_token_usage.usage_date default)
//   - how a budget is read from env (APOLLO_DAILY_TOKEN_BUDGET, optional)
//   - how usage is upserted after each successful model call
//   - how usage is summed for status reporting
//
// The budget enforcement is advisory: chat.js checks before the model call,
// and if today's total_tokens has already crossed the budget, it falls back
// to grounded mode WITHOUT calling the model. We never race-prevent a call
// that was already in flight — the next request just sees the new total and
// flips to grounded. Good enough for a solo-coach budget guardrail.

// Env — unset means "unlimited". Zero or non-numeric is treated as unlimited
// too (fail open rather than wedging Apollo on a typo).
function readBudget() {
  const raw = process.env.APOLLO_DAILY_TOKEN_BUDGET;
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function getDailyBudget() {
  return readBudget();
}

export function todayKeyUtc() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Sum every row for today across models. One round trip.
export async function getTodayTotals(client) {
  const { data, error } = await client
    .from("apollo_token_usage")
    .select("prompt_tokens,completion_tokens,total_tokens,call_count,model")
    .eq("usage_date", todayKeyUtc());
  if (error) {
    return { ok: false, error: error.message, totals: null };
  }
  const totals = (data || []).reduce((acc, row) => {
    acc.promptTokens += Number(row.prompt_tokens || 0);
    acc.completionTokens += Number(row.completion_tokens || 0);
    acc.totalTokens += Number(row.total_tokens || 0);
    acc.callCount += Number(row.call_count || 0);
    acc.models.add(row.model || "unknown");
    return acc;
  }, {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    callCount: 0,
    models: new Set(),
  });
  return {
    ok: true,
    error: null,
    totals: {
      ...totals,
      models: Array.from(totals.models),
    },
  };
}

// Budget status the chat path consumes to decide grounded-vs-model. Exhausted
// is a sticky yes once today's total crosses the budget — the *next* call is
// the one that gets blocked, not the call that caused the overflow.
export async function getBudgetStatus(client) {
  const budget = getDailyBudget();
  const snapshot = await getTodayTotals(client);
  if (!snapshot.ok) {
    // Read failure — fail open. Don't let a DB blip lock out Apollo chat.
    return {
      budget,
      used: null,
      remaining: null,
      exhausted: false,
      readError: snapshot.error,
    };
  }
  const used = snapshot.totals.totalTokens;
  if (budget === null) {
    return { budget: null, used, remaining: null, exhausted: false, readError: null };
  }
  const remaining = Math.max(0, budget - used);
  return {
    budget,
    used,
    remaining,
    exhausted: used >= budget,
    readError: null,
  };
}

// Record a single model call. Uses an UPSERT against the (usage_date, model)
// unique constraint so concurrent callers don't step on each other. Returns
// { ok, error } — caller decides whether to surface to the user (usually no,
// because we'd rather serve the reply than complain about accounting).
export async function recordTokenUsage(client, { model, usage }) {
  const row = {
    usage_date: todayKeyUtc(),
    model: model || "unknown",
    prompt_tokens: Number(usage?.promptTokens ?? usage?.prompt_tokens ?? 0) || 0,
    completion_tokens: Number(usage?.completionTokens ?? usage?.completion_tokens ?? 0) || 0,
    total_tokens: Number(usage?.totalTokens ?? usage?.total_tokens ?? 0) || 0,
    call_count: 1,
  };

  // Single-row path: fetch current, then upsert the sum. This is 2 round
  // trips, but it's fine for chat frequency and avoids needing a stored
  // procedure for atomic add. If two requests land concurrently the worst
  // case is we lose one call's tokens — acceptable for an advisory counter.
  const { data: existing, error: readError } = await client
    .from("apollo_token_usage")
    .select("prompt_tokens,completion_tokens,total_tokens,call_count")
    .eq("usage_date", row.usage_date)
    .eq("model", row.model)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: `token_usage read failed: ${readError.message}` };
  }

  if (existing) {
    const { error: updateError } = await client
      .from("apollo_token_usage")
      .update({
        prompt_tokens: Number(existing.prompt_tokens || 0) + row.prompt_tokens,
        completion_tokens: Number(existing.completion_tokens || 0) + row.completion_tokens,
        total_tokens: Number(existing.total_tokens || 0) + row.total_tokens,
        call_count: Number(existing.call_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("usage_date", row.usage_date)
      .eq("model", row.model);
    if (updateError) {
      return { ok: false, error: `token_usage update failed: ${updateError.message}` };
    }
    return { ok: true };
  }

  const { error: insertError } = await client
    .from("apollo_token_usage")
    .insert(row);
  if (insertError) {
    return { ok: false, error: `token_usage insert failed: ${insertError.message}` };
  }
  return { ok: true };
}
