import { useState } from "react";
import {
  Bot, CheckCircle2, Layers, Loader2, Send, Shield, Sparkles, XCircle,
} from "lucide-react";
import { sendApolloChatMessage } from "../lib/apolloChat";
import { decideApproval, queueApprovalFromChat } from "../lib/apolloApprovals";

// Apollo 13L — chat↔action bridge.
// Message bubbles can now carry two kinds of attachments:
//   - suggestedActions: model-proposed registry actions. A chip per action.
//     Click queues a pending approval (recommend or approval_required tier).
//     Once queued, the chip flips to a decision row with approve/reject.
//   - referencedApprovals: pending approvals the reply talks about. Rendered
//     as decision rows so the head coach can act without leaving chat.
// Nothing auto-executes — every side effect still requires a click.

const initialMessages = [
  {
    id: "apollo-intro",
    role: "assistant",
    content: "Apollo chat is online. I can answer from server-built context packs and approved Apollo memory; model-backed reasoning turns on only when the server AI Gateway key is configured.",
    meta: "Grounded mode",
    suggestedActions: [],
    referencedApprovals: [],
  },
];

function createMessage(role, content, meta = "", extras = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    meta,
    suggestedActions: extras.suggestedActions ?? [],
    referencedApprovals: extras.referencedApprovals ?? [],
  };
}

function MessageBubble({ message, onQueueSuggestion, onDecideApproval, busyKey }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] space-y-2 md:max-w-[78%] ${isUser ? "" : "w-full"}`}>
        <div className={`rounded-lg border px-4 py-3 ${
          isUser
            ? "border-accent/30 bg-accent/10 text-white"
            : "border-bg-border bg-bg-soft text-white/85"
        }`}>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
            {isUser ? "Gal" : "Apollo"}
            {message.meta && (
              <>
                <span>/</span>
                <span>{message.meta}</span>
              </>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        </div>

        {/* 13L: suggestion chips — each maps to a registry action. Queue-only;
            the head coach still clicks approve in the resulting row or in the
            standalone Approval Inbox. */}
        {!isUser && message.suggestedActions?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.suggestedActions.map((suggestion) => (
              <SuggestionChip
                key={`${message.id}-${suggestion.actionKey}-${suggestion.index}`}
                messageId={message.id}
                suggestion={suggestion}
                onQueue={onQueueSuggestion}
                busy={busyKey === `queue:${message.id}:${suggestion.index}`}
              />
            ))}
          </div>
        )}

        {/* 13L: inline approve/reject for referenced pending approvals. */}
        {!isUser && message.referencedApprovals?.length > 0 && (
          <div className="space-y-2">
            {message.referencedApprovals.map((approval) => (
              <InlineApprovalRow
                key={`${message.id}-${approval.id}`}
                approval={approval}
                busy={busyKey === `decide:${approval.id}`}
                onDecide={onDecideApproval}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionChip({ messageId, suggestion, onQueue, busy }) {
  const status = suggestion.queueStatus; // undefined | "queued" | "error"
  if (status === "queued" && suggestion.queuedApproval) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[11px] text-accent">
        <CheckCircle2 size={12} />
        <span className="font-semibold">Queued</span>
        <span className="text-accent/70">· {suggestion.queuedApproval.action_label}</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="rounded-lg border border-danger-border bg-danger-soft px-3 py-1.5 text-[11px] text-danger">
        Could not queue: {suggestion.queueError ?? "unknown"}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onQueue(messageId, suggestion)}
      disabled={busy}
      title={suggestion.reasoning || "Queue this action for approval"}
      className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
      {suggestion.label}
    </button>
  );
}

function InlineApprovalRow({ approval, busy, onDecide }) {
  const status = approval.inlineStatus ?? approval.status;
  const settled = ["completed", "rejected"].includes(status);
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-warning">
          Pending approval
        </div>
        <span className="text-[10px] text-white/40">{approval.autonomy_tier}</span>
      </div>
      <div className="text-xs font-semibold text-white/85">{approval.action_label}</div>
      {settled ? (
        <div className="mt-2 text-[11px] text-white/50">
          {status === "completed" ? "Approved and executed." : "Rejected."}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDecide(approval.id, "approve")}
            disabled={busy}
            className="btn btn-primary py-1 px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Approve
          </button>
          <button
            type="button"
            onClick={() => onDecide(approval.id, "reject")}
            disabled={busy}
            className="btn btn-secondary py-1 px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <XCircle size={11} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

const packStatusStyles = {
  ready: "border-accent/20 bg-accent/10 text-accent",
  partial: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
};

function ContextPackStatus({ context }) {
  if (!context?.packs?.length) return null;

  return (
    <div className="rounded-lg border border-bg-border bg-bg-soft p-3">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
          <Layers size={13} className="text-electric" />
          Context packs
        </div>
        <div className="text-[11px] font-semibold text-white/40">
          {context.summary?.ready ?? 0} ready / {context.summary?.partial ?? 0} partial
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {context.packs.map((pack) => (
          <span
            key={pack.key}
            className={`tag border normal-case tracking-normal ${packStatusStyles[pack.status] ?? "border-bg-border bg-bg-card2 text-white/50"}`}
            title={pack.summary}
          >
            {pack.title}: {pack.status}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ApolloChat({ onAuditRecorded }) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [contextSummary, setContextSummary] = useState(null);
  const [busyKey, setBusyKey] = useState("");

  const sendMessage = async (event) => {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft || status === "loading") return;

    setDraft("");
    setError("");
    setStatus("loading");
    setMessages((current) => [...current, createMessage("user", cleanDraft)]);

    try {
      const response = await sendApolloChatMessage(cleanDraft);
      const modeLabel = response.mode === "model"
        ? `Model: ${response.model}`
        : response.mode === "model_text_fallback"
          ? `Model (text only): ${response.model}`
          : response.mode === "grounded_budget_exhausted"
            ? "Grounded · budget reached"
            : "Grounded packs";
      setContextSummary(response.context ?? null);
      // 13L: stamp each suggestion with a stable index so React keys work
      // even when the model repeats an actionKey across two chips.
      const suggestedActions = (response.suggestedActions ?? []).map((s, index) => ({
        ...s,
        index,
      }));
      setMessages((current) => [
        ...current,
        createMessage("assistant", response.reply, `${modeLabel} / audit ${response.audit?.status ?? "unknown"}`, {
          suggestedActions,
          referencedApprovals: response.referencedApprovals ?? [],
        }),
      ]);
      if (response.audit?.runId) onAuditRecorded?.(response.audit.runId);
      setStatus("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Apollo chat could not answer.");
      setMessages((current) => [
        ...current,
        createMessage("assistant", "I could not answer that safely. The request was not recorded as a successful chat response.", "Error"),
      ]);
      setStatus("idle");
    }
  };

  // 13L: click a chip → queue a pending approval. Updates the chip in place
  // so the user sees confirmation without touching the Approval Inbox tab.
  const handleQueueSuggestion = async (messageId, suggestion) => {
    const key = `queue:${messageId}:${suggestion.index}`;
    setBusyKey(key);
    try {
      const result = await queueApprovalFromChat({
        actionKey: suggestion.actionKey,
        payload: suggestion.payload ?? {},
        reasoning: suggestion.reasoning ?? "",
      });
      setMessages((current) => current.map((message) => {
        if (message.id !== messageId) return message;
        return {
          ...message,
          suggestedActions: message.suggestedActions.map((s) => (
            s.index === suggestion.index
              ? { ...s, queueStatus: "queued", queuedApproval: result.approval ?? { action_label: s.label } }
              : s
          )),
          // 13L: the newly-queued approval also appears in the inline decision
          // list so the head coach can approve it without leaving chat.
          referencedApprovals: result.approval
            ? [...message.referencedApprovals.filter((a) => a.id !== result.approvalId), result.approval]
            : message.referencedApprovals,
        };
      }));
      onAuditRecorded?.(null); // nudge parent to refresh counts if it cares
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Queue failed.";
      setMessages((current) => current.map((message) => {
        if (message.id !== messageId) return message;
        return {
          ...message,
          suggestedActions: message.suggestedActions.map((s) => (
            s.index === suggestion.index ? { ...s, queueStatus: "error", queueError: msg } : s
          )),
        };
      }));
    } finally {
      setBusyKey("");
    }
  };

  // 13L: approve or reject a referenced approval directly from chat. Goes
  // through the standard decide endpoint — identical gate as the Approval
  // Inbox, just surfaced here for convenience.
  const handleDecideApproval = async (approvalId, decision) => {
    const key = `decide:${approvalId}`;
    setBusyKey(key);
    try {
      const result = await decideApproval({ approvalId, decision });
      const newStatus = result.status ?? (decision === "approve" ? "completed" : "rejected");
      setMessages((current) => current.map((message) => ({
        ...message,
        referencedApprovals: message.referencedApprovals.map((a) => (
          a.id === approvalId ? { ...a, inlineStatus: newStatus } : a
        )),
      })));
      onAuditRecorded?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${decision} approval.`);
    } finally {
      setBusyKey("");
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Bot size={16} className="text-accent" />
            <h3 className="font-display font-bold">Apollo Chat</h3>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">
            Ask Apollo about audit history, roadmap, memory, and current agent guardrails. Responses use approved server context packs. When the model has something concrete to propose, you'll see action chips below the reply — nothing runs until you approve.
          </p>
        </div>
        <div className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-accent">
          <span className="inline-flex items-center gap-2">
            <Shield size={13} />
            Head-coach only
          </span>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-bg-border bg-bg-card2 p-3">
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onQueueSuggestion={handleQueueSuggestion}
              onDecideApproval={handleDecideApproval}
              busyKey={busyKey}
            />
          ))}
          {status === "loading" && (
            <div className="flex justify-start">
              <div className="rounded-lg border border-bg-border bg-bg-soft px-4 py-3 text-sm text-white/45">
                Apollo is reading the context packs...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <ContextPackStatus context={contextSummary} />

        <form onSubmit={sendMessage} className="flex flex-col gap-2 md:flex-row">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            maxLength={1200}
            placeholder="Ask Apollo what needs attention, what Security found, or what should happen next."
            className="input min-h-16 flex-1 resize-none"
          />
          <button
            type="submit"
            disabled={status === "loading" || !draft.trim()}
            className="btn btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60 md:self-stretch"
          >
            <Send size={14} />
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
