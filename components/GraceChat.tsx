"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GraceChatMessage, GraceFilterIntent, GraceQuickReply } from "@/lib/grace-chat";
import { preferredScrollBehavior } from "@/lib/scroll-behavior";

type ProjectSuggestion = {
  slug: string;
  name: string;
  image?: string;
  developer?: string;
  location: string;
  startingPrice: string;
  priceScope?: "project";
  paymentPlan?: string;
  handover?: string;
  bedrooms?: string[];
};

type ChatResponse = {
  messages?: GraceChatMessage[];
  suggestions?: ProjectSuggestion[];
  quickReplies?: GraceQuickReply[];
  filterIntent?: GraceFilterIntent;
  articles?: Array<{ title: string; category: string; href: string }>;
  agent?: { name: string; title: string } | null;
  agentAction?: { type: "prepare_report"; label: string; href: string } | null;
  briefAction?: { type: "email_pdf" | "download_pdf"; label: string; href?: string } | null;
  leadCaptured?: boolean;
  leadId?: number | null;
  error?: string;
};

const OPEN_KEY = "hg:grace-chat-open:v1";
let documentSessionId = "";
const GREETING: GraceChatMessage = {
  role: "assistant",
  content: "Welcome. I’m Sonu, PSR Homes’ AI property concierge. Tell me whether you are looking for a home or an investment, and I’ll help narrow the right UAE opportunities.",
};

function sessionId() {
  if (/^[a-f0-9-]{36}$/i.test(documentSessionId)) return documentSessionId;
  documentSessionId = window.crypto.randomUUID();
  return documentSessionId;
}

function conciseConversation(messages: GraceChatMessage[]) {
  const recentAssistantReplies: string[] = [];
  return messages.filter((message) => {
    if (message.role !== "assistant") return true;
    const normalized = message.content.toLowerCase().replace(/\s+/g, " ").trim();
    if (recentAssistantReplies.includes(normalized)) return false;
    recentAssistantReplies.push(normalized);
    if (recentAssistantReplies.length > 6) recentAssistantReplies.shift();
    return true;
  });
}

function greetingFor(agent: ChatResponse["agent"]): GraceChatMessage {
  if (!agent) return GREETING;
  return {
    role: "assistant",
    content: `Welcome back, ${agent.name.split(" ")[0]}. I’ll keep this conversation connected to your PSR advisor context. Ask me to research a project, compare opportunities or prepare a client report.`,
  };
}

function shouldAutofocusChat() {
  return window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 681px) and (min-height: 521px)").matches;
}

export function GraceChat({ initialOpen = false }: { initialOpen?: boolean } = {}) {
  const [open, setOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<GraceChatMessage[]>([GREETING]);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [quickReplies, setQuickReplies] = useState<GraceQuickReply[]>([]);
  const [articles, setArticles] = useState<Array<{ title: string; category: string; href: string }>>([]);
  const [agent, setAgent] = useState<ChatResponse["agent"]>(null);
  const [agentAction, setAgentAction] = useState<ChatResponse["agentAction"]>(null);
  const [briefAction, setBriefAction] = useState<ChatResponse["briefAction"]>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"research" | "report">("research");
  const [error, setError] = useState("");
  const [expression, setExpression] = useState<"attentive" | "thinking" | "happy" | "confused">("attentive");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const filterSignatureRef = useRef("");

  function syncPageFilters(filterIntent?: GraceFilterIntent) {
    if (!filterIntent) return;
    const signature = JSON.stringify(filterIntent);
    const meaningful = Boolean(filterIntent.query || filterIntent.emirate || filterIntent.propertyType);
    if (!meaningful || signature === filterSignatureRef.current) return;
    filterSignatureRef.current = signature;
    window.dispatchEvent(new CustomEvent("hg:grace-filter", { detail: filterIntent }));
    const form = document.querySelector<HTMLFormElement>("form.property-search");
    if (!form) return;
    const assignments: Array<[string, string]> = [
      ["q", filterIntent.query],
      ["emirate", filterIntent.emirate],
      ["type", filterIntent.propertyType],
    ];
    assignments.forEach(([name, value]) => {
      if (!value) return;
      const field = form.elements.namedItem(name);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
      const optionExists = field instanceof HTMLInputElement
        || [...field.options].some((option) => option.value === value);
      if (!optionExists) return;
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
    form.dataset.graceUpdated = "true";
  }

  function applyResult(result: ChatResponse) {
    const currentGreeting = greetingFor(result.agent);
    if (result.messages?.length) setMessages(conciseConversation([currentGreeting, ...result.messages]));
    else setMessages([currentGreeting]);
    setSuggestions(result.suggestions || []);
    setQuickReplies(result.quickReplies || []);
    setArticles(result.articles || []);
    setAgent(result.agent || null);
    setAgentAction(result.agentAction || null);
    setBriefAction(result.briefAction || null);
    setLeadCaptured(Boolean(result.leadCaptured));
    syncPageFilters(result.filterIntent);
  }

  function rememberPanelState(value: boolean) {
    try {
      window.sessionStorage.setItem(OPEN_KEY, value ? "yes" : "no");
    } catch {
      // Chat remains usable when browser storage is unavailable.
    }
  }

  function setPanelOpen(value: boolean) {
    rememberPanelState(value);
    setOpen(value);
  }

  function prepareForNativeNavigation() {
    rememberPanelState(false);
  }

  useEffect(() => {
    try {
      if (initialOpen) window.sessionStorage.setItem(OPEN_KEY, "yes");
      if (window.sessionStorage.getItem(OPEN_KEY) === "yes") setOpen(true);
    } catch {
      // Default to a closed panel when browser storage is unavailable.
    }
  }, [initialOpen]);

  useEffect(() => {
    if (!open) return;
    if (shouldAutofocusChat()) inputRef.current?.focus({ preventScroll: true });
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch("/api/grace-chat", {
      headers: { "x-grace-session": sessionId() },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to restore the conversation.");
        return response.json() as Promise<ChatResponse>;
      })
      .then((result) => {
        applyResult(result);
      })
      .catch(() => {
        // A new conversation remains available if prior state cannot be restored.
      });
  }, [open]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hg:overlay-change", {
      detail: { source: "grace-chat", open },
    }));
    return () => {
      if (open) {
        window.dispatchEvent(new CustomEvent("hg:overlay-change", {
          detail: { source: "grace-chat", open: false },
        }));
      }
    };
  }, [open]);

  useEffect(() => {
    function handleOverlayChange(event: Event) {
      const detail = (event as CustomEvent<{ source?: string; open?: boolean }>).detail;
      if (!open || !detail?.open || detail.source === "grace-chat") return;
      rememberPanelState(false);
      setOpen(false);
    }
    window.addEventListener("hg:overlay-change", handleOverlayChange);
    return () => window.removeEventListener("hg:overlay-change", handleOverlayChange);
  }, [open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: preferredScrollBehavior() });
  }, [messages, loading]);

  useEffect(() => {
    if (!open || loading || !shouldAutofocusChat()) return;
    const animationFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [open, loading, messages.length, quickReplies.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanelOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function sendMessage(value: string) {
    const message = value.trim().slice(0, 800);
    if (!message || loading) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    setError("");
    setLoadingMode(/\b(?:pdf|report|brief|comparison|proposal|generate|prepare)\b/i.test(message) ? "report" : "research");
    setLoading(true);
    setExpression("thinking");
    setQuickReplies([]);
    setAgentAction(null);
    setBriefAction(null);
    const requestId = crypto.randomUUID();
    try {
      let result: ChatResponse | null = null;
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 45_000);
        try {
          const response = await fetch("/api/grace-chat", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-grace-session": sessionId(),
            },
            body: JSON.stringify({ message, requestId }),
            signal: controller.signal,
          });
          const payload = await response.json() as ChatResponse;
          if (!response.ok) {
            const failure = new Error(payload.error || "Sonu is temporarily unavailable.");
            if (response.status < 500 || attempt === 1) throw failure;
            lastError = failure;
          } else {
            result = payload;
          }
        } catch (caught) {
          lastError = caught instanceof Error ? caught : new Error("Sonu is temporarily unavailable.");
          if (attempt === 1) throw lastError;
        } finally {
          window.clearTimeout(timeout);
        }
        if (!result) await new Promise((resolve) => window.setTimeout(resolve, 550));
      }
      if (!result) throw lastError || new Error("Sonu is temporarily unavailable.");
      applyResult(result);
      setExpression(result.suggestions?.length || result.leadCaptured ? "happy" : "attentive");
      window.setTimeout(() => setExpression("attentive"), 1_800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sonu is temporarily unavailable.");
      setExpression("confused");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function openGuidedFinder() {
    setPanelOpen(false);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("hg:open-grace-finder"));
    }, 120);
  }

  function runBriefAction() {
    if (briefAction?.href?.startsWith("/api/client-briefs/")) {
      window.location.assign(briefAction.href);
      return;
    }
    openGuidedFinder();
  }

  return (
    <div className={`grace-chat ${open ? "is-open" : ""} ${loading ? "is-thinking" : ""} is-${expression}`}>
      {open ? (
        <section className="grace-chat-panel" role="dialog" aria-modal="false" aria-label="Chat with Sonu, PSR AI property concierge">
          <header className="grace-chat-header">
            <div className="grace-chat-identity">
              <span className="grace-chat-monogram sonu-chat-avatar" aria-hidden="true">
                <img src="/ai/sonu-ui.png" alt="" />
              </span>
              <div>
                <strong>Sonu</strong>
                <span>{agent ? `${agent.name} · connected advisor` : "PSR AI property concierge"}</span>
              </div>
            </div>
            <button type="button" className="grace-chat-close" aria-label="Close Sonu" onClick={() => setPanelOpen(false)}>
              <span aria-hidden="true" />
            </button>
          </header>

          <div className="grace-chat-messages" ref={messagesRef} aria-live="polite">
            {messages.map((message, index) => (
              <p className={`grace-chat-message is-${message.role}`} key={`${message.role}-${index}-${message.content.slice(0, 20)}`}>
                {message.content}
              </p>
            ))}
            {loading ? <div className="grace-chat-progress" role="status">
              <span className="grace-chat-progress-mark" aria-hidden="true"><i /></span>
              <span>
                <strong>{loadingMode === "report" ? "Preparing your private report" : "Reviewing current PSR records"}</strong>
                <small>{loadingMode === "report" ? "Composing verified details and report visuals" : "Matching your request to live catalogue evidence"}</small>
              </span>
            </div> : null}
            {error ? <p className="grace-chat-error" role="alert">{error}</p> : null}
            {leadCaptured ? (
              <p className="grace-chat-captured">
                <span aria-hidden="true" />
                Sent securely to the PSR advisory desk
              </p>
            ) : null}
            {suggestions.length && !loading ? (
              <div className="grace-chat-suggestions" aria-label="Relevant projects">
                {suggestions.map((project) => (
                  <a
                    href={`/projects/${project.slug}`}
                    key={project.slug}
                    aria-label={`Open ${project.name} project record`}
                    data-project-slug={project.slug}
                    onClick={prepareForNativeNavigation}
                  >
                    {project.image ? <span className="grace-chat-project-image"><img src={project.image} alt="" width="320" height="240" loading="lazy" decoding="async" /></span> : null}
                    <span className="grace-chat-project-copy">
                      <small>{project.developer || "PSR selection"}</small>
                      <strong>{project.name}</strong>
                      <span>{project.location}</span>
                      <span className="grace-chat-price-scope">Project entry · {project.startingPrice}</span>
                      <span>{[project.paymentPlan, project.handover].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="grace-chat-project-open">Open project <i aria-hidden="true" /></span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grace-chat-actions">
            {messages.length === 1 ? (
              <div className="grace-chat-prompts" aria-label="Conversation starters">
                {["Find an investment", "Find a family home", "Compare communities"].map((prompt) => (
                  <button type="button" key={prompt} onClick={() => void sendMessage(prompt)}>{prompt}</button>
                ))}
                <button type="button" onClick={openGuidedFinder}>Build my curated brief</button>
              </div>
            ) : null}
            {quickReplies.length && !loading ? (
              <div className="grace-chat-quick-replies" aria-label="Choose an answer">
                {quickReplies.map((reply) => (
                  <button type="button" key={`${reply.label}-${reply.value}`} onClick={() => void sendMessage(reply.value)}>
                    {reply.label}
                  </button>
                ))}
              </div>
            ) : null}
            {articles.length && !loading ? (
              <div className="grace-chat-articles" aria-label="Relevant market research">
                {articles.map((article) => (
                  <a href={article.href} key={article.href} onClick={prepareForNativeNavigation}>
                    <small>{article.category}</small><strong>{article.title}</strong>
                  </a>
                ))}
              </div>
            ) : null}
            {agentAction ? (
              <a className="grace-chat-agent-action" href={agentAction.href} onClick={prepareForNativeNavigation}>
                {agentAction.label}
              </a>
            ) : null}
            {briefAction ? (
              <button className="grace-chat-brief-cta" type="button" onClick={runBriefAction}>
                {briefAction.label}
              </button>
            ) : null}
            {leadCaptured && !briefAction ? (
              <button className="grace-chat-brief-cta" type="button" onClick={openGuidedFinder}>
                Create my private PDF
              </button>
            ) : null}
          </div>

          <form className="grace-chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="grace-chat-input">Message Sonu</label>
            <input
              ref={inputRef}
              id="grace-chat-input"
              value={draft}
              maxLength={800}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about UAE property"
              autoComplete="off"
            />
            <button type="submit" disabled={loading || !draft.trim()} aria-label="Send message">
              <span aria-hidden="true" />
            </button>
          </form>
          <p className="grace-chat-disclosure">AI guidance. Prices and availability require advisor confirmation.</p>
        </section>
      ) : null}

      <button
        type="button"
        className="grace-chat-launcher"
        aria-expanded={open}
        aria-label={open ? "Close Sonu" : "Open chat with Sonu, your AI broker"}
        onClick={() => {
          const next = !open;
          setPanelOpen(next);
        }}
      >
        <img className="grace-chat-launcher-image" src="/ai/sonu-ui.png" alt="" aria-hidden="true" />
        <span className="grace-chat-greeting" aria-hidden="true">Hi I am Sonu, Your AI Broker</span>
      </button>
    </div>
  );
}
