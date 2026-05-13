import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  appliedActions?: string[]; // labels of auto-applied actions
}

interface Action {
  type: string;
  [key: string]: any;
}

interface AIWidgetProps {
  pageContext?: Record<string, any>;
}

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS: Record<string, { label: string; prompt: string }[]> = {
  post: [
    { label: "Write intro", prompt: "Write an engaging introduction for this post and set it as the content." },
    { label: "Generate title", prompt: "Generate a compelling title for this post and update it." },
    { label: "Write excerpt", prompt: "Write a concise meta description for this post and set it as the excerpt." },
    { label: "Full draft", prompt: "Write a complete draft post based on the current title and set it as the content." },
  ],
  dashboard: [
    { label: "New post idea", prompt: "Suggest a blog post idea and create a new draft for it." },
    { label: "What can you do?", prompt: "What can you help me with in this CMS?" },
    { label: "Site audit", prompt: "Give me a quick content strategy checklist for my site." },
  ],
  default: [
    { label: "What can you do?", prompt: "What can you help me with on this page?" },
    { label: "Create a post", prompt: "Create a new draft blog post with a good title and intro." },
  ],
};

const SESSION_KEY = "ap_ai_widget";

interface Session {
  messages: Message[];
  open: boolean;
  pendingActions?: Action[];
}

function saveSession(messages: Message[], open: boolean, pendingActions?: Action[]) {
  try {
    const s: Session = { messages, open };
    if (pendingActions?.length) s.pendingActions = pendingActions;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {}
}

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// ─── Auto-execute action blocks ───────────────────────────────────────────────

function executeAction(
  action: Action,
  persistAndNavigate: (url: string) => void
): string | null {
  switch (action.type) {
    case "setTitle": {
      const el = document.getElementById("post-title") as HTMLInputElement | null;
      if (el) {
        el.value = action.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return `Title → "${action.value}"`;
      }
      return null;
    }
    case "setExcerpt": {
      const el = document.getElementById("post-excerpt") as HTMLTextAreaElement | null;
      if (el) {
        el.value = action.value;
        return "Excerpt updated";
      }
      return null;
    }
    case "setContent": {
      window.dispatchEvent(new CustomEvent("ap:setContent", { detail: { html: action.html } }));
      return "Content updated";
    }
    case "setStatus": {
      const el = document.getElementById("post-status") as HTMLSelectElement | null;
      if (el) {
        el.value = action.value;
        return `Status → ${action.value}`;
      }
      return null;
    }
    case "navigate": {
      persistAndNavigate(action.url);
      return `Opening ${action.url}…`;
    }
    case "savePost": {
      if (typeof (window as any).savePost === "function") {
        setTimeout(() => (window as any).savePost(action.status ?? null), 400);
        return "Saving…";
      }
      return null;
    }
    default:
      return null;
  }
}

function parseAndExecute(
  text: string,
  messages: Message[],
  onNavigate: (url: string, pending: Action[]) => void
): { content: string; applied: string[] } {
  // First pass: collect all actions
  const allActions: Action[] = [];
  const content = text
    .replace(/```action\n([\s\S]*?)```/g, (_, json) => {
      try { allActions.push(JSON.parse(json.trim()) as Action); } catch {}
      return "";
    })
    .trim();

  const navigateAction = allActions.find((a) => a.type === "navigate");
  const otherActions = allActions.filter((a) => a.type !== "navigate");

  const applied: string[] = [];

  if (navigateAction) {
    // Content actions can't run on current page if we're navigating to a new one.
    // Save them as pending so the new page picks them up.
    onNavigate(navigateAction.url, otherActions);
    applied.push(`Opening ${navigateAction.url}…`);
    if (otherActions.length) {
      applied.push(`Will apply ${otherActions.length} action(s) on next page`);
    }
  } else {
    // No navigation — execute all immediately
    for (const action of otherActions) {
      const result = executeAction(action, () => {});
      if (result) applied.push(result);
    }
  }

  return { content, applied };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SparkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIWidget({ pageContext = {} }: AIWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumed, setResumed] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const pageType =
    path.includes("/posts/") || path.includes("/pages/") || path.includes("/cpt/")
      ? "post"
      : path.includes("/dashboard")
      ? "dashboard"
      : "default";

  const quickPrompts = QUICK_PROMPTS[pageType] ?? QUICK_PROMPTS.default;

  // Restore session on first mount + execute any pending actions
  useEffect(() => {
    const session = loadSession();
    if (session) {
      if (session.messages?.length) setMessages(session.messages);
      if (session.open) setOpen(true);

      // Execute pending actions once DOM + editor are ready
      if (session.pendingActions?.length) {
        const pending = session.pendingActions;
        // Clear pending from storage immediately to avoid re-running
        saveSession(session.messages ?? [], session.open ?? false);

        const hasContentAction = pending.some((a) => a.type === "setContent");

        const runPending = () => {
          const appliedLabels: string[] = [];
          for (const action of pending) {
            const result = executeAction(action, () => {});
            if (result) appliedLabels.push(result);
          }
          if (appliedLabels.length && session.messages?.length) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  appliedActions: [...(last.appliedActions ?? []), ...appliedLabels],
                };
              }
              return updated;
            });
          }
        };

        if (hasContentAction) {
          // Wait for BlockEditor to signal it's mounted before dispatching setContent
          let fired = false;
          const onReady = () => {
            if (fired) return;
            fired = true;
            window.removeEventListener("ap:editorReady", onReady);
            // Small tick to let React finish rendering the editor
            setTimeout(runPending, 100);
          };
          window.addEventListener("ap:editorReady", onReady);
          // Fallback: if editor never fires (e.g. page has no block editor), run after 4s
          setTimeout(() => { if (!fired) { fired = true; window.removeEventListener("ap:editorReady", onReady); runPending(); } }, 4000);
        } else {
          // No content action — just wait for #post-title to appear
          const tryApply = (attempts: number) => {
            if (document.getElementById("post-title") || attempts >= 10) {
              runPending();
            } else {
              setTimeout(() => tryApply(attempts + 1), 300);
            }
          };
          setTimeout(() => tryApply(0), 300);
        }
      }
    }
    setResumed(true);
  }, []);

  // Persist on every change (after initial restore)
  useEffect(() => {
    if (!resumed) return;
    saveSession(messages, open); // no pending — clears any leftover pending
  }, [messages, open, resumed]);

  // Navigate, keep session alive, and carry pending actions to next page
  const persistAndNavigate = useCallback((url: string, pending: Action[] = []) => {
    saveSession(messages, true, pending);
    setTimeout(() => { window.location.href = url; }, 300);
  }, [messages]);

  const buildContext = useCallback((): Record<string, any> => {
    const ctx: Record<string, any> = { currentPage: path, ...pageContext };
    const titleEl = document.getElementById("post-title") as HTMLInputElement | null;
    if (titleEl?.value) ctx.postTitle = titleEl.value;
    const statusEl = document.getElementById("post-status") as HTMLSelectElement | null;
    if (statusEl?.value) ctx.postStatus = statusEl.value;
    const excerptEl = document.getElementById("post-excerpt") as HTMLTextAreaElement | null;
    if (excerptEl?.value) ctx.postExcerpt = excerptEl.value.slice(0, 200);
    return ctx;
  }, [path, pageContext]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context: buildContext() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Request failed");

      // Auto-execute all action blocks immediately
      const { content: replyContent, applied } = parseAndExecute(
        data.reply,
        newMessages,
        persistAndNavigate
      );

      setMessages([
        ...newMessages,
        { role: "assistant", content: replyContent, appliedActions: applied },
      ]);
    } catch (e: any) {
      const msg = e.message ?? "Something went wrong";
      setError(msg);
      setMessages([
        ...newMessages,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button — hidden when panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="AI Assistant"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 99998,
            width: 46, height: 46, borderRadius: "50%",
            background: "#2271b1",
            border: "none",
            boxShadow: "0 2px 12px rgba(0,0,0,.28)",
            cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <SparkIcon />
        </button>
      )}

      {/* Slide-in panel */}
      <div style={{
        position: "fixed", right: 0, top: 32, bottom: 0, zIndex: 99997,
        width: 380,
        background: "#fff",
        borderLeft: "1px solid #dcdcde",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,.1)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform .22s cubic-bezier(.4,0,.2,1)",
      }}>

        {/* Header */}
        <div style={{
          background: "#1d2327", color: "#fff",
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          <SparkIcon />
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>AstroPress AI</span>
          {messages.length > 0 && (
            <button
              onClick={() => {
              setMessages([]);
              setError("");
              try { sessionStorage.removeItem(SESSION_KEY); } catch {}
            }}
              style={{
                background: "none", border: "none", color: "rgba(255,255,255,.4)",
                fontSize: 11, cursor: "pointer", padding: "2px 6px", fontFamily: "inherit",
              }}
            >
              Clear
            </button>
          )}
          <a href="/admin/settings/ai" style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "none" }}>
            Settings
          </a>
          {/* Close button — inside header, no floating button overlap */}
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "rgba(255,255,255,.08)", border: "none",
              color: "rgba(255,255,255,.7)",
              width: 26, height: 26, borderRadius: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, marginLeft: 4,
            }}
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Provider badge */}
        <ProviderBadge />

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: 16,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.length === 0 && (
            <div>
              <p style={{ fontSize: 13, color: "#646970", margin: "0 0 14px", lineHeight: 1.6 }}>
                Just tell me what you need — I'll do it automatically.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {quickPrompts.map((p) => (
                  <button
                    key={p.prompt}
                    onClick={() => send(p.prompt)}
                    style={{
                      textAlign: "left", background: "#f6f7f7",
                      border: "1px solid #dcdcde", borderRadius: 3,
                      padding: "7px 10px", fontSize: 12, cursor: "pointer",
                      color: "#3c434a", fontFamily: "inherit", lineHeight: 1.4,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              margin: "0 0 4px",
            }}>
              <div style={{ flex: 1, height: 1, background: "#f0f0f1" }} />
              <span style={{ fontSize: 10, color: "#c3c4c7", whiteSpace: "nowrap" }}>
                {path}
              </span>
              <div style={{ flex: 1, height: 1, background: "#f0f0f1" }} />
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%" }}>
                  <div style={{
                    background: "#2271b1", color: "#fff",
                    padding: "8px 12px",
                    borderRadius: "12px 12px 2px 12px",
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={i} style={{ alignSelf: "flex-start", maxWidth: "96%", display: "flex", flexDirection: "column", gap: 5 }}>
                {msg.content && (
                  <div style={{
                    background: "#f6f7f7", border: "1px solid #dcdcde",
                    padding: "8px 12px",
                    borderRadius: "2px 12px 12px 12px",
                    fontSize: 13, lineHeight: 1.65, color: "#1d2327",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </div>
                )}
                {/* Auto-applied action chips */}
                {msg.appliedActions && msg.appliedActions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {msg.appliedActions.map((a, ai) => (
                      <span key={ai} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: "#d1e7dd", color: "#146c43",
                        borderRadius: 10, padding: "2px 8px",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div style={{ alignSelf: "flex-start" }}>
              <div style={{
                background: "#f6f7f7", border: "1px solid #dcdcde",
                padding: "8px 14px", borderRadius: "2px 12px 12px 12px",
                fontSize: 13, color: "#8c8f94",
              }}>
                <AnimatedDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 12px 14px",
          borderTop: "1px solid #dcdcde",
          flexShrink: 0, background: "#fff",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Tell me what to do…"
              rows={2}
              style={{
                flex: 1, resize: "none",
                border: "1px solid #8c8f94", borderRadius: 3,
                padding: "6px 8px", fontSize: 13,
                fontFamily: "inherit", outline: "none", lineHeight: 1.4,
                transition: "border-color .08s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2271b1")}
              onBlur={(e) => (e.target.style.borderColor = "#8c8f94")}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: "#2271b1", color: "#fff",
                border: "none", borderRadius: 3,
                padding: "10px 12px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.45 : 1,
                flexShrink: 0,
              }}
            >
              <SendIcon />
            </button>
          </div>
          {error && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#d63638" }}>{error}</p>}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProviderBadge() {
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d) => { if (d.activeProvider) setProvider(d.activeProvider); })
      .catch(() => {});
  }, []);

  if (!provider) return null;

  const labels: Record<string, string> = {
    anthropic: "Claude", openai: "GPT", gemini: "Gemini", mistral: "Mistral", groq: "Groq",
  };

  return (
    <div style={{
      padding: "4px 14px", background: "#f6f7f7",
      borderBottom: "1px solid #f0f0f1",
      fontSize: 11, color: "#646970",
      display: "flex", alignItems: "center", gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00a32a", display: "inline-block" }} />
      {labels[provider] ?? provider}
    </div>
  );
}

function AnimatedDots() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 400);
    return () => clearInterval(t);
  }, []);
  return <span>Working{dots}</span>;
}
