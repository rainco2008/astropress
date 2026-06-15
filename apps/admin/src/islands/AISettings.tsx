import { useState, useEffect } from "react";

const PROVIDERS = [
  {
    id: "none",
    name: "None (disable AI assistant)",
    models: [],
  },
  {
    id: "cloudflare-ai",
    name: "Cloudflare Workers AI (no API key needed)",
    note: "Uses the AI binding from your Cloudflare dashboard. Add an AI binding named \"AI\" in Workers & Pages → your project → Settings → Bindings.",
    models: [
      { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Llama 3.3 70B (recommended)" },
      { id: "@cf/meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B (faster)" },
      { id: "@cf/mistral/mistral-7b-instruct-v0.1", label: "Mistral 7B" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    url: "https://console.anthropic.com",
    models: [
      { id: "claude-sonnet-4-6", label: "claude-sonnet-4-6" },
      { id: "claude-opus-4-6", label: "claude-opus-4-6" },
      { id: "claude-haiku-4-5-20251001", label: "claude-haiku-4-5-20251001" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    url: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", label: "gpt-4o" },
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "gpt-4-turbo", label: "gpt-4-turbo" },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    url: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-flash-latest", label: "gemini-flash-latest" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    url: "https://console.mistral.ai/api-keys",
    models: [
      { id: "mistral-large-latest", label: "mistral-large-latest" },
      { id: "mistral-small-latest", label: "mistral-small-latest" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    url: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile" },
      { id: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant" },
    ],
  },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

export default function AISettings() {
  const [activeProvider, setActiveProvider] = useState<ProviderId>("none");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [editingKey, setEditingKey] = useState(false);
  const [systemContext, setSystemContext] = useState("");
  const [confirmBeforeAction, setConfirmBeforeAction] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json() as any)
      .then((data) => {
        const provider = data.activeProvider ?? "none";
        setActiveProvider(provider as ProviderId);
        const cfg = data.providers?.[provider];
        if (cfg) {
          setModel(cfg.defaultModel ?? "");
          if (cfg._hasKey || cfg.apiKey) {
            setHasStoredKey(true);
            setApiKey("••••••••••••••••");
          }
        }
        setSystemContext(data.systemContext ?? "");
        setConfirmBeforeAction(data.confirmBeforeAction !== false); // default true
      })
      .catch(() => {});
  }, []);

  const selectedProvider = PROVIDERS.find((p) => p.id === activeProvider);
  const needsKey = activeProvider !== "none" && activeProvider !== "cloudflare-ai";
  const isCloudflareAI = activeProvider === "cloudflare-ai";

  const handleProviderChange = (id: ProviderId) => {
    setActiveProvider(id);
    setApiKey("");
    setHasStoredKey(false);
    setEditingKey(false);
    setTestStatus("idle");
    setTestMessage("");
    const p = PROVIDERS.find((x) => x.id === id);
    setModel((p as any)?.models?.[0]?.id ?? "");
  };

  const handleChangeKey = () => {
    setApiKey("");
    setEditingKey(true);
    setShowKey(true);
  };

  const save = async () => {
    setStatus("saving");
    try {
      const isMasked = /^•+$/.test(apiKey);
      const providerConfig = activeProvider === "none" ? {} : {
        [activeProvider]: activeProvider === "cloudflare-ai"
          ? { enabled: true, defaultModel: model }
          : { enabled: true, defaultModel: model, apiKey: isMasked ? undefined : apiKey },
      };
      const body = {
        activeProvider,
        systemContext,
        confirmBeforeAction,
        providers: providerConfig,
      };
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error);
      setStatus("saved");
      setEditingKey(false);
      setShowKey(false);
      if (!isMasked && apiKey) {
        setHasStoredKey(true);
        setApiKey("••••••••••••••••");
      }
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const testConnection = async () => {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const isMasked = /^•+$/.test(apiKey);
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider,
          model,
          // Send actual key if user typed one; omit if masked (server uses saved key instead)
          apiKey: isMasked ? undefined : (apiKey || undefined),
        }),
      });
      const data = await res.json() as any;
      if (res.ok && data.reply) {
        setTestStatus("ok");
        setTestMessage("Connected successfully.");
      } else {
        setTestStatus("fail");
        setTestMessage(data.error ?? "Connection failed.");
      }
    } catch (e: any) {
      setTestStatus("fail");
      setTestMessage(e.message ?? "Connection failed.");
    }
  };

  return (
    <div style={{ maxWidth: 540, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{
        background: "#fff", border: "1px solid #c3c4c7",
        borderRadius: 3, padding: "24px 28px", marginBottom: 20,
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#1d2327" }}>
          AI Provider
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#646970", lineHeight: 1.5 }}>
          Choose an AI provider for the assistant. The API key is stored in your database and never exposed to the browser.
        </p>

        {/* Provider radio list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {PROVIDERS.map((p) => (
            <label key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", fontSize: 13, color: "#1d2327",
            }}>
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={activeProvider === p.id}
                onChange={() => handleProviderChange(p.id as ProviderId)}
                style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#2271b1" }}
              />
              {p.name}
              {"url" in p && activeProvider === p.id && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: "#2271b1", textDecoration: "none", marginLeft: 4 }}
                >
                  Get API key ↗
                </a>
              )}
            </label>
          ))}
        </div>

        {/* Workers AI info note */}
        {isCloudflareAI && (
          <div style={{ borderTop: "1px solid #f0f0f1", paddingTop: 20 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#646970", lineHeight: 1.6 }}>
              {(selectedProvider as any)?.note}
            </p>
            {selectedProvider && "models" in selectedProvider && selectedProvider.models.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1d2327" }}>
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    width: "100%", height: 34, padding: "0 8px",
                    border: "1px solid #8c8f94", borderRadius: 3,
                    fontSize: 13, fontFamily: "inherit", background: "#fff",
                    outline: "none",
                  }}
                >
                  {selectedProvider.models.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={testConnection}
              disabled={testStatus === "testing"}
              style={{
                marginTop: 14, height: 34, padding: "0 14px",
                background: "#fff", border: "1px solid #dcdcde",
                borderRadius: 3, fontSize: 12, color: "#3c434a",
                cursor: testStatus === "testing" ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {testStatus === "testing" ? "Testing…" : "Test connection"}
            </button>
            {testMessage && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: testStatus === "ok" ? "#00a32a" : "#d63638" }}>
                {testMessage}
              </p>
            )}
          </div>
        )}

        {/* Model + API key — shown only when a provider is selected */}
        {needsKey && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid #f0f0f1", paddingTop: 20 }}>
            {/* Model */}
            {selectedProvider && "models" in selectedProvider && selectedProvider.models.length > 1 && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1d2327" }}>
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    width: "100%", height: 34, padding: "0 8px",
                    border: "1px solid #8c8f94", borderRadius: 3,
                    fontSize: 13, fontFamily: "inherit", background: "#fff",
                    outline: "none",
                  }}
                >
                  {selectedProvider.models.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedProvider && "models" in selectedProvider && selectedProvider.models.length === 1 && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1d2327" }}>
                  Model
                </label>
                <input
                  type="text"
                  value={selectedProvider.models[0].id}
                  readOnly
                  style={{
                    width: "100%", height: 34, padding: "0 8px",
                    border: "1px solid #dcdcde", borderRadius: 3,
                    fontSize: 13, fontFamily: "inherit", background: "#f6f7f7",
                    color: "#646970", boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>
            )}

            {/* API Key */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1d2327" }}>
                API Key
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showKey && !hasStoredKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setEditingKey(true); }}
                  placeholder="Paste your API key"
                  disabled={hasStoredKey && !editingKey}
                  style={{
                    flex: 1, height: 34, padding: "0 8px",
                    border: "1px solid #8c8f94", borderRadius: 3,
                    fontSize: 13, fontFamily: "inherit",
                    background: hasStoredKey && !editingKey ? "#f6f7f7" : "#fff",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                {hasStoredKey && !editingKey ? (
                  <button
                    onClick={handleChangeKey}
                    style={{
                      height: 34, padding: "0 12px",
                      background: "#fff", border: "1px solid #dcdcde",
                      borderRadius: 3, fontSize: 12, color: "#2271b1",
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                  >
                    Change
                  </button>
                ) : (
                  <button
                    onClick={() => setShowKey((s) => !s)}
                    style={{
                      height: 34, padding: "0 12px",
                      background: "#fff", border: "1px solid #dcdcde",
                      borderRadius: 3, fontSize: 12, color: "#3c434a",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                )}
                <button
                  onClick={testConnection}
                  disabled={testStatus === "testing"}
                  style={{
                    height: 34, padding: "0 12px",
                    background: "#fff", border: "1px solid #dcdcde",
                    borderRadius: 3, fontSize: 12, color: "#3c434a",
                    cursor: testStatus === "testing" ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  {testStatus === "testing" ? "Testing…" : "Test connection"}
                </button>
              </div>
              {testMessage && (
                <p style={{
                  margin: "6px 0 0", fontSize: 12,
                  color: testStatus === "ok" ? "#00a32a" : "#d63638",
                }}>
                  {testMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* System Context */}
      <div style={{
        background: "#fff", border: "1px solid #c3c4c7",
        borderRadius: 3, padding: "24px 28px", marginBottom: 20,
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#1d2327" }}>
          AI Context &amp; Instructions
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#646970", lineHeight: 1.6 }}>
          Everything you write here is prepended to every AI operation on this site — content generation, chat, block generation, and more. Use it to set the AI's persona, share company information, define brand voice, and list dos and don'ts.
        </p>
        <textarea
          value={systemContext}
          onChange={e => setSystemContext(e.target.value)}
          rows={10}
          placeholder={`Examples of what to include:\n\n• Company name, tagline, and industry\n• Target audience and tone of voice\n• Do's: always use inclusive language, cite sources, use metric units\n• Don'ts: never mention competitors, avoid jargon, don't make pricing claims\n• Brand keywords and preferred terminology\n• Any legal or compliance disclaimers to include`}
          style={{
            width: "100%", padding: "10px 12px",
            border: "1px solid #8c8f94", borderRadius: 3,
            fontSize: 13, fontFamily: "inherit", lineHeight: 1.6,
            resize: "vertical", outline: "none", boxSizing: "border-box",
            color: "#1d2327",
          }}
        />
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#8c8f94" }}>
          This context is never shown to site visitors. It is sent to the AI provider on every request.
        </p>
      </div>

      {/* Behaviour */}
      <div style={{
        background: "#fff", border: "1px solid #c3c4c7",
        borderRadius: 3, padding: "24px 28px", marginBottom: 20,
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#1d2327" }}>
          Behaviour
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#646970", lineHeight: 1.5 }}>
          Control how the AI assistant handles actions that modify your site.
        </p>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
          <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
            <input
              type="checkbox"
              checked={confirmBeforeAction}
              onChange={e => setConfirmBeforeAction(e.target.checked)}
              style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
            />
            <div
              onClick={() => setConfirmBeforeAction(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: "pointer",
                background: confirmBeforeAction ? "#2271b1" : "#c3c4c7",
                transition: "background .15s",
                position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: 2, borderRadius: "50%",
                width: 16, height: 16, background: "#fff",
                left: confirmBeforeAction ? 18 : 2,
                transition: "left .15s",
                boxShadow: "0 1px 3px rgba(0,0,0,.25)",
              }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1d2327", lineHeight: 1.4 }}>
              Ask for confirmation before making changes
            </div>
            <div style={{ fontSize: 12, color: "#646970", marginTop: 3, lineHeight: 1.5 }}>
              When enabled (default), the AI shows you a plan of what it will do and waits for your approval before executing any create, update, or delete actions. Turn off to let the AI act immediately.
            </div>
          </div>
        </label>
      </div>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={save}
          disabled={status === "saving"}
          style={{
            height: 34, padding: "0 18px",
            background: "#2271b1", color: "#fff",
            border: "1px solid #135e96", borderRadius: 3,
            fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saving" ? "Saving…" : "Save Settings"}
        </button>
        {status === "saved" && (
          <span style={{ fontSize: 13, color: "#00a32a", fontWeight: 600 }}>Saved.</span>
        )}
        {status === "error" && (
          <span style={{ fontSize: 13, color: "#d63638" }}>Failed to save. Try again.</span>
        )}
      </div>
    </div>
  );
}
