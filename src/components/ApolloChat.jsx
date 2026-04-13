import { useState } from "react";
import { Bot, Layers, Send, Shield } from "lucide-react";
import { sendApolloChatMessage } from "../lib/apolloChat";

const initialMessages = [
  {
    id: "apollo-intro",
    role: "assistant",
    content: "Apollo chat is online. I can answer from server-built context packs; model-backed reasoning turns on only when the server AI Gateway key is configured.",
    meta: "Grounded mode",
  },
];

function createMessage(role, content, meta = "") {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    meta,
  };
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] rounded-lg border px-4 py-3 md:max-w-[78%] ${
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
        : "Grounded packs";
      setContextSummary(response.context ?? null);
      setMessages((current) => [
        ...current,
        createMessage("assistant", response.reply, `${modeLabel} / audit ${response.audit?.status ?? "unknown"}`),
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

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Bot size={16} className="text-accent" />
            <h3 className="font-display font-bold">Apollo Chat</h3>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">
            Ask Apollo about audit history, roadmap, and current agent guardrails. Responses use approved server context packs.
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
            <MessageBubble key={message.id} message={message} />
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
