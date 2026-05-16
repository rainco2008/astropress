import { useState, useCallback, useRef, useEffect } from "react";
import type { Block, BlockType, ThemeTokens } from "@astropress/core/types/theme";
import { BLOCK_DEFAULTS } from "@astropress/core/types/theme";

interface FormOption { id: string; title: string; fieldCount: number; }

interface Props {
  slug: string;
  pageTitle: string;
  initialBlocks: Block[];
  initialTokens: ThemeTokens;
  forms?: FormOption[];
  isTemplate?: boolean;
  templatePart?: "header" | "footer";
  siteUrl?: string;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const CONTENT_PALETTE = [
  { type: "ai" as BlockType, label: "✨ AI Block", desc: "Describe anything — AI picks the best block" },
  { type: "hero" as BlockType, label: "Hero", desc: "Full-width banner with headline & CTA" },
  { type: "text" as BlockType, label: "Text", desc: "Rich text content" },
  { type: "image" as BlockType, label: "Image", desc: "Image with caption" },
  { type: "cta" as BlockType, label: "Call to Action", desc: "Colored band with button" },
  { type: "features" as BlockType, label: "Features", desc: "Card grid with icons" },
  { type: "columns" as BlockType, label: "Columns", desc: "Two-column layout" },
  { type: "form" as BlockType, label: "Form", desc: "Embed a contact form" },
  { type: "spacer" as BlockType, label: "Spacer", desc: "Vertical whitespace" },
  { type: "divider" as BlockType, label: "Divider", desc: "Horizontal rule" },
  { type: "html" as BlockType, label: "HTML", desc: "Custom HTML embed" },
];

const TEMPLATE_PALETTE = [
  { type: "ai" as BlockType, label: "✨ AI Block", desc: "Describe anything — AI picks the best block" },
  { type: "nav" as BlockType, label: "Navigation", desc: "Site navigation with logo" },
  { type: "site-title" as BlockType, label: "Site Title", desc: "Site name and tagline" },
  { type: "text" as BlockType, label: "Text", desc: "Rich text content" },
  { type: "columns" as BlockType, label: "Columns", desc: "Multi-column layout" },
  { type: "html" as BlockType, label: "HTML", desc: "Custom HTML" },
  { type: "spacer" as BlockType, label: "Spacer", desc: "Vertical space" },
  { type: "divider" as BlockType, label: "Divider", desc: "Horizontal rule" },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Inline Editable ──────────────────────────────────────────────────────────
function Editable({ value, onSave, style, html = false, placeholder = "" }: {
  value: string; onSave: (v: string) => void;
  style?: React.CSSProperties; html?: boolean; placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el === document.activeElement) return;
    if (html) el.innerHTML = value || placeholder;
    else el.textContent = value || placeholder;
  }, [value, html, placeholder]);
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning
      data-placeholder={placeholder}
      style={{ outline: "none", cursor: "text", minHeight: "1em", ...style }}
      onClick={e => e.stopPropagation()}
      onFocus={e => { if (e.currentTarget.textContent === placeholder) e.currentTarget.textContent = ""; }}
      onBlur={e => onSave(html ? e.currentTarget.innerHTML : e.currentTarget.textContent || "")}
    />
  );
}

// ─── AI Block (separate component for hooks) ──────────────────────────────────
function AIBlockPreview({ block, tokens, isSelected, onPropChange, onReplace }: {
  block: Block; tokens: ThemeTokens; isSelected?: boolean;
  onPropChange?: (key: string, val: unknown) => void; onReplace?: (b: Block) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const prompt = String(block.props.prompt || "");

  const generate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!prompt.trim()) return;
    setGenerating(true); setError("");
    try {
      const res = await fetch("/api/ai/generate-blocks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, singleBlock: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Generation failed"); return; }
      const generated: Block[] = data.blocks ?? [];
      if (generated.length > 0 && onReplace) onReplace({ ...generated[0], id: block.id });
    } catch { setError("Network error"); }
    finally { setGenerating(false); }
  };

  return (
    <div style={{ padding: "48px", background: tokens.colors.surface, borderTop: "3px solid #7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
      <div style={{ maxWidth: "560px", width: "100%", background: "#fff", border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.spacing.borderRadius, padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <span style={{ fontSize: "1.3rem" }}>✨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#1d2327" }}>AI Block</div>
            <div style={{ fontSize: "11px", color: tokens.colors.textMuted }}>Describe what you want — AI picks the best block type</div>
          </div>
        </div>
        {isSelected && onPropChange ? (
          <Editable value={prompt} onSave={v => onPropChange("prompt", v)}
            placeholder="e.g. a pricing table with 3 tiers, or a team section..."
            style={{ width: "100%", minHeight: "72px", padding: "10px 12px", border: `1px solid ${tokens.colors.border}`, borderRadius: "4px", fontSize: "13px", color: tokens.colors.text, background: tokens.colors.surface, lineHeight: "1.6", boxSizing: "border-box" }}
          />
        ) : (
          <div style={{ padding: "10px 12px", border: `1px solid ${tokens.colors.border}`, borderRadius: "4px", minHeight: "48px", fontSize: "13px", color: prompt ? tokens.colors.text : tokens.colors.textMuted, background: tokens.colors.surface }}>
            {prompt || "Click to set prompt…"}
          </div>
        )}
        {error && <div style={{ marginTop: "12px", padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "4px", fontSize: "12px", color: "#dc2626" }}>{error}</div>}
        <button onClick={generate} disabled={generating || !prompt.trim()}
          style={{ marginTop: "16px", width: "100%", padding: "10px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: 600, cursor: generating || !prompt.trim() ? "not-allowed" : "pointer", opacity: !prompt.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {generating ? <><span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating…</> : <>✨ Generate Block</>}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ─── Block Canvas Previews ────────────────────────────────────────────────────
function BlockPreview({ block, tokens, forms, isSelected, onPropChange, onReplace }: {
  block: Block; tokens: ThemeTokens; forms?: FormOption[]; isSelected?: boolean;
  onPropChange?: (key: string, val: unknown) => void; onReplace?: (b: Block) => void;
}) {
  const p = block.props;
  const sty: React.CSSProperties = { fontFamily: tokens.fonts.body, color: tokens.colors.text };
  const editable = !!(isSelected && onPropChange);

  function T(key: string, fallback: string, style: React.CSSProperties, htmlContent = false) {
    if (editable) return <Editable value={String(p[key] ?? "")} onSave={v => onPropChange!(key, v)} style={style} html={htmlContent} placeholder={fallback} />;
    if (htmlContent) return <div style={style} dangerouslySetInnerHTML={{ __html: String(p[key] || fallback) }} />;
    return <div style={style}>{String(p[key] || fallback)}</div>;
  }

  switch (block.type) {
    case "hero": {
      const align = String(p.align || "center");
      const height = Number(p.height) || 400;
      const itemsAlign = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
      return (
        <div style={{ background: String(p.bgColor || "#1a1a2e"), color: String(p.textColor || "#fff"), padding: "80px 48px", textAlign: align as any, minHeight: `${height}px`, display: "flex", flexDirection: "column", alignItems: itemsAlign, justifyContent: "center", fontFamily: tokens.fonts.heading }}>
          {T("heading", "Hero Heading", { fontSize: "2.5rem", fontWeight: 700, margin: "0 0 16px", lineHeight: "1.15", maxWidth: "800px", color: "inherit" })}
          {(p.subtext || editable) && T("subtext", "Subtext (optional)", { fontSize: "1.15rem", margin: "0 0 32px", opacity: "0.85", maxWidth: "560px", color: "inherit" })}
          {(p.buttonText || editable) && T("buttonText", "Button label", { display: "inline-block", background: tokens.colors.primary, color: "#fff", padding: "14px 32px", borderRadius: tokens.spacing.borderRadius, fontWeight: 600, fontSize: "1rem" })}
        </div>
      );
    }
    case "text":
      return <div style={{ ...sty, padding: "48px 60px", textAlign: (p.align as any) || "left", lineHeight: 1.75 }}>
        {T("content", "<p>Click to edit text...</p>", { fontFamily: tokens.fonts.body, fontSize: "1.05rem", lineHeight: "1.75", color: tokens.colors.text }, true)}
      </div>;
    case "image": {
      const maxW = p.width === "full" ? "100%" : p.width === "wide" ? "900px" : "640px";
      return (
        <div style={{ padding: "32px 48px", textAlign: (p.align as any) || "center" }}>
          {p.src ? <img src={String(p.src)} alt={String(p.alt || "")} style={{ maxWidth: maxW, borderRadius: tokens.spacing.borderRadius, display: "inline-block" }} />
            : <div style={{ width: "100%", maxWidth: maxW, height: "220px", background: "#f0f4f8", border: "2px dashed #cbd5e1", borderRadius: tokens.spacing.borderRadius, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "14px" }}>
              {editable ? "Set image URL in the Style panel" : "No image URL set"}
            </div>}
          {(p.caption || editable) && T("caption", "Caption (optional)", { fontSize: "0.85rem", color: tokens.colors.textMuted, marginTop: "8px", textAlign: "center" })}
        </div>
      );
    }
    case "cta":
      return (
        <div style={{ background: String(p.bgColor || tokens.colors.primary), color: String(p.textColor || "#fff"), padding: "72px 48px", textAlign: "center", fontFamily: tokens.fonts.heading }}>
          {T("heading", "Call to Action", { fontSize: "2rem", margin: "0 0 12px", fontWeight: 700, color: "inherit" })}
          {(p.text || editable) && T("text", "Subtitle text (optional)", { margin: "0 0 32px", opacity: "0.9", maxWidth: "560px", marginLeft: "auto", marginRight: "auto", color: "inherit" })}
          {(p.buttonText || editable) && T("buttonText", "Button label", { display: "inline-block", background: "rgba(255,255,255,0.15)", color: "inherit", padding: "12px 28px", borderRadius: tokens.spacing.borderRadius, border: "2px solid rgba(255,255,255,0.4)", fontWeight: 600 })}
        </div>
      );
    case "features": {
      const items = (p.items as any[]) || [];
      const cols = Number(p.cols) || 3;
      return (
        <div style={{ ...sty, padding: "72px 48px", textAlign: "center" }}>
          {T("heading", "Features Heading", { fontSize: "2rem", margin: "0 0 12px", fontFamily: tokens.fonts.heading, fontWeight: 700 })}
          {(p.subtext || editable) && T("subtext", "Subtext (optional)", { color: tokens.colors.textMuted, margin: "0 0 48px" })}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "28px", textAlign: "left" }}>
            {items.map((item: any, i: number) => (
              <div key={i} style={{ padding: "28px", background: tokens.colors.surface, borderRadius: tokens.spacing.borderRadius, border: `1px solid ${tokens.colors.border}` }}>
                {editable ? <>
                  <Editable value={item.icon || "★"} onSave={v => { const n = [...items]; n[i] = { ...item, icon: v }; onPropChange!("items", n); }} style={{ fontSize: "2rem", marginBottom: "12px" }} />
                  <Editable value={item.title || ""} onSave={v => { const n = [...items]; n[i] = { ...item, title: v }; onPropChange!("items", n); }} style={{ fontFamily: tokens.fonts.heading, fontWeight: 600, marginBottom: "8px", fontSize: "1.05rem" }} placeholder="Feature title" />
                  <Editable value={item.text || ""} onSave={v => { const n = [...items]; n[i] = { ...item, text: v }; onPropChange!("items", n); }} style={{ color: tokens.colors.textMuted, fontSize: "0.95rem", lineHeight: "1.6" }} placeholder="Feature description" />
                </> : <>
                  <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{item.icon || "★"}</div>
                  <h3 style={{ margin: "0 0 8px", fontFamily: tokens.fonts.heading, fontSize: "1.05rem" }}>{item.title}</h3>
                  <p style={{ margin: 0, color: tokens.colors.textMuted, fontSize: "0.95rem", lineHeight: 1.6 }}>{item.text}</p>
                </>}
              </div>
            ))}
            {editable && <button onClick={e => { e.stopPropagation(); onPropChange!("items", [...items, { icon: "★", title: "New Feature", text: "Feature description." }]); }} style={{ padding: "28px", background: "transparent", border: `2px dashed ${tokens.colors.border}`, borderRadius: tokens.spacing.borderRadius, cursor: "pointer", color: tokens.colors.textMuted, fontSize: "13px" }}>+ Add item</button>}
          </div>
        </div>
      );
    }
    case "columns":
      return (
        <div style={{ ...sty, padding: "48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: String(p.gap || "2rem") }}>
          {T("leftContent", "<p>Left column content...</p>", { fontFamily: tokens.fonts.body, lineHeight: "1.75" }, true)}
          {T("rightContent", "<p>Right column content...</p>", { fontFamily: tokens.fonts.body, lineHeight: "1.75" }, true)}
        </div>
      );
    case "form": {
      const form = forms?.find(f => f.id === String(p.formId || ""));
      return (
        <div style={{ ...sty, padding: "48px", textAlign: "center" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto", background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.spacing.borderRadius, padding: "32px" }}>
            {form ? <>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "16px", fontFamily: tokens.fonts.heading }}>{form.title}</div>
              <div style={{ color: tokens.colors.textMuted, fontSize: "13px", marginBottom: "16px" }}>{form.fieldCount} field{form.fieldCount !== 1 ? "s" : ""}</div>
              <div style={{ background: tokens.colors.primary, color: "#fff", padding: "10px 24px", borderRadius: tokens.spacing.borderRadius, display: "inline-block", fontSize: "13px", fontWeight: 600 }}>Submit</div>
            </> : <div style={{ color: tokens.colors.textMuted, fontSize: "14px", padding: "24px 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⊞</div>
              {p.formId ? "Form not found" : editable ? "Select a form in the Content panel →" : "No form selected"}
            </div>}
          </div>
        </div>
      );
    }
    case "nav":
      return (
        <div style={{ background: tokens.colors.background, borderBottom: `1px solid ${tokens.colors.border}`, padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          {editable ? <Editable value={String(p.logoText || "")} onSave={v => onPropChange!("logoText", v)} style={{ fontFamily: tokens.fonts.heading, fontWeight: 700, fontSize: "1.2rem", color: tokens.colors.text }} placeholder="Site Name" />
            : <div style={{ fontFamily: tokens.fonts.heading, fontWeight: 700, fontSize: "1.2rem", color: tokens.colors.text }}>{String(p.logoText || "Site Name")}</div>}
          <nav style={{ display: "flex", gap: "24px" }}>
            {["Home", "About", "Blog", "Contact"].map(item => <span key={item} style={{ color: tokens.colors.textMuted, fontSize: "14px" }}>{item}</span>)}
          </nav>
        </div>
      );
    case "site-title":
      return (
        <div style={{ ...sty, padding: "24px 48px", textAlign: (p.align as any) || "left" }}>
          <div style={{ fontFamily: tokens.fonts.heading, fontWeight: 700, fontSize: p.size === "large" ? "2rem" : p.size === "small" ? "1rem" : "1.4rem", color: tokens.colors.text }}>Site Name</div>
          {p.showTagline && <div style={{ color: tokens.colors.textMuted, fontSize: "0.9rem", marginTop: "4px" }}>Site tagline goes here</div>}
        </div>
      );
    case "spacer":
      return <div style={{ height: `${Number(p.height) || 64}px`, background: "repeating-linear-gradient(45deg,#f8fafc,#f8fafc 10px,#f0f4f8 10px,#f0f4f8 20px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", color: "#94a3b8", background: "#fff", padding: "2px 8px", borderRadius: "99px", border: "1px solid #e2e8f0" }}>{Number(p.height) || 64}px</span>
      </div>;
    case "divider":
      return <div style={{ padding: "16px 48px" }}><hr style={{ border: "none", borderTop: `${Number(p.thickness) || 1}px ${String(p.style || "solid")} ${String(p.color || "#e2e8f0")}`, margin: 0 }} /></div>;
    case "html":
      return <div style={{ padding: "24px 48px", ...sty }} dangerouslySetInnerHTML={{ __html: String(p.content || "") }} />;
    case "ai":
      return <AIBlockPreview block={block} tokens={tokens} isSelected={isSelected} onPropChange={onPropChange} onReplace={onReplace} />;
    default:
      return <div style={{ padding: "20px", color: "#999", fontStyle: "italic" }}>Unknown block type</div>;
  }
}

// ─── Shared form primitives ────────────────────────────────────────────────────
const inp: React.CSSProperties = { width: "100%", padding: "7px 9px", border: "1px solid #3c434a", borderRadius: "3px", fontSize: "12px", fontFamily: "inherit", boxSizing: "border-box", background: "#1d2327", color: "#e0e0e0" };
const lbl: React.CSSProperties = { display: "block", fontSize: "11px", fontWeight: 600, color: "#8c8f94", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" };
const fld: React.CSSProperties = { marginBottom: "14px" };

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return <div style={fld}><label style={lbl}>{name}</label>{children}</div>;
}
function Inp({ value, onChange, type = "text", rows, placeholder }: { value: string; onChange: (v: string) => void; type?: string; rows?: number; placeholder?: string }) {
  if (rows) return <textarea style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
  return <input style={inp} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <select style={inp} value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
function ColorField({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={lbl}>{name}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: "30px", height: "30px", border: "1px solid #3c434a", borderRadius: "3px", padding: "1px", cursor: "pointer", background: "none" }} />
        <input style={{ ...inp, fontFamily: "monospace", fontSize: "12px", flex: 1 }} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}

const alignOpts = [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }];

// ─── Block Content Panels (data/media/text settings) ──────────────────────────
function BlockContent({ block, onChange, forms }: { block: Block; onChange: (props: Record<string, unknown>) => void; forms?: FormOption[] }) {
  const p = block.props;
  const set = (key: string) => (val: unknown) => onChange({ ...p, [key]: val });

  switch (block.type) {
    case "hero":
      return <>
        <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0 0 14px", lineHeight: 1.6 }}>Click text on the canvas to edit heading, subtext, and button label directly.</p>
        <Field name="Button URL"><Inp value={String(p.buttonUrl || "")} onChange={set("buttonUrl")} type="url" placeholder="https://…" /></Field>
      </>;

    case "text":
      return <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0", lineHeight: 1.6 }}>Click the text on the canvas to edit content directly. Rich HTML is supported.</p>;

    case "image":
      return <>
        <Field name="Image URL"><Inp value={String(p.src || "")} onChange={set("src")} type="url" placeholder="https://…" /></Field>
        <Field name="Alt Text"><Inp value={String(p.alt || "")} onChange={set("alt")} placeholder="Describe the image" /></Field>
        <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0", lineHeight: 1.6 }}>Click the caption on canvas to edit it directly.</p>
      </>;

    case "cta":
      return <>
        <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0 0 14px", lineHeight: 1.6 }}>Click heading, subtitle, and button text on the canvas to edit directly.</p>
        <Field name="Button URL"><Inp value={String(p.buttonUrl || "")} onChange={set("buttonUrl")} type="url" placeholder="https://…" /></Field>
      </>;

    case "features": {
      const items = (p.items as any[]) || [];
      return <>
        <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0 0 14px", lineHeight: 1.6 }}>Click any item icon, title, or text on the canvas to edit inline.</p>
        <div style={fld}>
          <label style={lbl}>Items ({items.length})</label>
          <button onClick={() => set("items")([...items, { icon: "★", title: "New Feature", text: "Feature description." }])} style={{ fontSize: "12px", color: "#72aee6", background: "none", border: "1px dashed #50575e", borderRadius: "3px", padding: "7px 12px", cursor: "pointer", width: "100%", marginBottom: "6px" }}>+ Add Item</button>
          {items.length > 0 && <button onClick={() => set("items")(items.slice(0, -1))} style={{ fontSize: "12px", color: "#f87171", background: "none", border: "1px dashed #4a2222", borderRadius: "3px", padding: "7px 12px", cursor: "pointer", width: "100%" }}>− Remove Last Item</button>}
        </div>
      </>;
    }

    case "columns":
      return <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0", lineHeight: 1.6 }}>Click either column on the canvas to edit the HTML content directly.</p>;

    case "form":
      return <>
        <Field name="Select Form">
          <select style={inp} value={String(p.formId || "")} onChange={e => {
            const f = forms?.find(f => f.id === e.target.value);
            onChange({ ...p, formId: e.target.value, ...(f ? { formTitle: f.title } : {}) });
          }}>
            <option value="">— Choose a form —</option>
            {(forms || []).map(f => <option key={f.id} value={f.id}>{f.title} ({f.fieldCount} fields)</option>)}
          </select>
        </Field>
        {(forms?.length === 0) && <p style={{ fontSize: "12px", color: "#8c8f94" }}>No forms yet. <a href="/admin/forms/create" target="_blank" style={{ color: "#72aee6" }}>Create one ↗</a></p>}
      </>;

    case "nav":
      return <>
        <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0 0 14px", lineHeight: 1.6 }}>Click the site name on the canvas to edit it directly. Nav links come from your Menu settings.</p>
        <a href="/admin/menus" target="_blank" style={{ fontSize: "12px", color: "#72aee6" }}>Edit Menus ↗</a>
      </>;

    case "site-title":
      return <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0", lineHeight: 1.6 }}>Site name and tagline come from your General Settings.</p>;

    case "spacer":
      return <Field name="Height (px)">
        <input type="number" style={inp} value={Number(p.height) || 64} min={8} max={400} step={8} onChange={e => set("height")(Number(e.target.value))} />
        <input type="range" value={Number(p.height) || 64} min={8} max={400} step={8} onChange={e => set("height")(Number(e.target.value))} style={{ width: "100%", marginTop: "6px", accentColor: "#72aee6" }} />
      </Field>;

    case "html":
      return <Field name="HTML Content"><textarea style={{ ...inp, resize: "vertical", lineHeight: 1.5, fontFamily: "monospace" }} rows={12} value={String(p.content || "")} onChange={e => set("content")(e.target.value)} placeholder="<div>Custom HTML…</div>" /></Field>;

    case "ai": {
      const set2 = (key: string) => (val: unknown) => onChange({ ...p, [key]: val });
      return <>
        <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0 0 12px", lineHeight: 1.6 }}>Type your prompt, then hit Generate on the canvas. AI will replace this placeholder with the best matching block.</p>
        <Field name="Prompt"><textarea style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} rows={4} value={String(p.prompt || "")} onChange={e => set2("prompt")(e.target.value)} placeholder="e.g. a pricing table with 3 tiers" /></Field>
      </>;
    }

    default:
      return <p style={{ color: "#8c8f94", fontSize: "12px" }}>No content settings.</p>;
  }
}

// ─── Block Style Panels (visual/layout settings) ──────────────────────────────
function BlockStyle({ block, onChange }: { block: Block; onChange: (props: Record<string, unknown>) => void }) {
  const p = block.props;
  const set = (key: string) => (val: unknown) => onChange({ ...p, [key]: val });

  switch (block.type) {
    case "hero":
      return <>
        <ColorField name="Background Color" value={String(p.bgColor || "#1a1a2e")} onChange={set("bgColor")} />
        <ColorField name="Text Color" value={String(p.textColor || "#ffffff")} onChange={set("textColor")} />
        <Field name="Text Alignment"><Sel value={String(p.align || "center")} onChange={set("align")} options={alignOpts} /></Field>
        <Field name="Min Height (px)"><input type="number" style={inp} value={Number(p.height) || 480} min={200} max={900} step={20} onChange={e => set("height")(Number(e.target.value))} /></Field>
      </>;

    case "text":
      return <Field name="Alignment"><Sel value={String(p.align || "left")} onChange={set("align")} options={alignOpts} /></Field>;

    case "image":
      return <>
        <Field name="Alignment"><Sel value={String(p.align || "center")} onChange={set("align")} options={alignOpts} /></Field>
        <Field name="Width"><Sel value={String(p.width || "normal")} onChange={set("width")} options={[{ value: "normal", label: "Normal (640px)" }, { value: "wide", label: "Wide (900px)" }, { value: "full", label: "Full Width" }]} /></Field>
      </>;

    case "cta":
      return <>
        <ColorField name="Background Color" value={String(p.bgColor || "#2271b1")} onChange={set("bgColor")} />
        <ColorField name="Text Color" value={String(p.textColor || "#ffffff")} onChange={set("textColor")} />
      </>;

    case "features":
      return <Field name="Columns"><Sel value={String(p.cols || "3")} onChange={v => set("cols")(Number(v))} options={[{ value: "2", label: "2 Columns" }, { value: "3", label: "3 Columns" }, { value: "4", label: "4 Columns" }]} /></Field>;

    case "columns":
      return <Field name="Column Gap"><Inp value={String(p.gap || "2rem")} onChange={set("gap")} placeholder="2rem" /></Field>;

    case "nav":
      return <Field name="Links Alignment"><Sel value={String(p.align || "right")} onChange={set("align")} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} /></Field>;

    case "site-title":
      return <>
        <Field name="Size"><Sel value={String(p.size || "medium")} onChange={set("size")} options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]} /></Field>
        <Field name="Alignment"><Sel value={String(p.align || "left")} onChange={set("align")} options={alignOpts} /></Field>
        <div style={fld}><label style={{ ...lbl, marginBottom: "8px" }}>Show Tagline</label><label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}><input type="checkbox" checked={!!p.showTagline} onChange={e => set("showTagline")(e.target.checked)} style={{ accentColor: "#72aee6" }} /><span style={{ fontSize: "12px", color: "#a7aaad" }}>Show site tagline below name</span></label></div>
      </>;

    case "divider":
      return <>
        <Field name="Line Style"><Sel value={String(p.style || "solid")} onChange={set("style")} options={[{ value: "solid", label: "Solid" }, { value: "dashed", label: "Dashed" }, { value: "dotted", label: "Dotted" }]} /></Field>
        <ColorField name="Color" value={String(p.color || "#e2e8f0")} onChange={set("color")} />
        <Field name="Thickness (px)"><input type="number" style={inp} value={Number(p.thickness) || 1} min={1} max={16} onChange={e => set("thickness")(Number(e.target.value))} /></Field>
      </>;

    default:
      return <p style={{ color: "#8c8f94", fontSize: "12px" }}>No style settings for this block.</p>;
  }
}

// ─── Global Theme Panel ────────────────────────────────────────────────────────
function ThemePanel({ tokens, onChange }: { tokens: ThemeTokens; onChange: (t: ThemeTokens) => void }) {
  const setColor = (key: keyof ThemeTokens["colors"]) => (val: string) => onChange({ ...tokens, colors: { ...tokens.colors, [key]: val } });
  const setFont = (key: keyof ThemeTokens["fonts"]) => (val: string) => onChange({ ...tokens, fonts: { ...tokens.fonts, [key]: val } });
  const setSpacing = (key: keyof ThemeTokens["spacing"]) => (val: string) => onChange({ ...tokens, spacing: { ...tokens.spacing, [key]: val } });
  const colorLabels: Record<keyof ThemeTokens["colors"], string> = { primary: "Primary", secondary: "Secondary", background: "Background", surface: "Surface", text: "Text", textMuted: "Muted Text", border: "Border" };
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: "11px", color: "#8c8f94", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Colors</div>
      {(Object.keys(tokens.colors) as (keyof ThemeTokens["colors"])[]).map(key => (
        <ColorField key={key} name={colorLabels[key]} value={tokens.colors[key]} onChange={setColor(key)} />
      ))}
      <div style={{ fontWeight: 700, fontSize: "11px", color: "#8c8f94", textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 12px" }}>Typography</div>
      <Field name="Heading Font"><Inp value={tokens.fonts.heading} onChange={setFont("heading")} placeholder="Georgia, serif" /></Field>
      <Field name="Body Font"><Inp value={tokens.fonts.body} onChange={setFont("body")} placeholder="system-ui, sans-serif" /></Field>
      <div style={{ fontWeight: 700, fontSize: "11px", color: "#8c8f94", textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 12px" }}>Spacing</div>
      <Field name="Section Padding Y"><Inp value={tokens.spacing.sectionY} onChange={setSpacing("sectionY")} /></Field>
      <Field name="Max Width"><Inp value={tokens.spacing.containerMax} onChange={setSpacing("containerMax")} /></Field>
      <Field name="Border Radius"><Inp value={tokens.spacing.borderRadius} onChange={setSpacing("borderRadius")} /></Field>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
type LeftPanel = "palette" | "block" | "theme";
type BlockTab = "content" | "style";

export default function ThemeEditor({ slug, pageTitle, initialBlocks, initialTokens, forms = [], isTemplate = false, templatePart, siteUrl = "" }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [tokens, setTokens] = useState<ThemeTokens>(initialTokens);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [paletteTab, setPaletteTab] = useState<"elements" | "navigator">("elements");
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("palette");
  const [blockTab, setBlockTab] = useState<BlockTab>("content");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMode, setAiMode] = useState<"append" | "replace">("append");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(false);

  const palette = isTemplate ? TEMPLATE_PALETTE : CONTENT_PALETTE;
  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

  const selectBlock = useCallback((id: string) => {
    setSelectedId(id);
    setLeftPanel("block");
    setBlockTab("content");
  }, []);

  const deselectBlock = useCallback(() => {
    setSelectedId(null);
    setLeftPanel("palette");
  }, []);

  const addBlock = useCallback((type: BlockType) => {
    const nb: Block = { id: uid(), type, props: { ...BLOCK_DEFAULTS[type] } };
    setBlocks(prev => {
      if (selectedId) {
        const idx = prev.findIndex(b => b.id === selectedId);
        const next = [...prev];
        next.splice(idx + 1, 0, nb);
        return next;
      }
      return [...prev, nb];
    });
    selectBlock(nb.id);
  }, [selectedId, selectBlock]);

  const updateBlock = useCallback((id: string, props: Record<string, unknown>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, props } : b));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    deselectBlock();
  }, [deselectBlock]);

  const moveBlock = useCallback((id: string, dir: "up" | "down") => {
    setBlocks(prev => {
      const i = prev.findIndex(b => b.id === id);
      if (dir === "up" && i === 0) return prev;
      if (dir === "down" && i === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === "up" ? i - 1 : i + 1;
      [next[i], next[swap]] = [next[swap], next[i]];
      return next;
    });
  }, []);

  const replaceBlock = useCallback((id: string, newBlock: Block) => {
    setBlocks(prev => prev.map(b => b.id === id ? newBlock : b));
    setSelectedId(newBlock.id);
    setLeftPanel("block");
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const i = prev.findIndex(b => b.id === id);
      const clone = { ...prev[i], id: uid(), props: { ...prev[i].props } };
      const next = [...prev];
      next.splice(i + 1, 0, clone);
      return next;
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch(`/api/page-schema/${encodeURIComponent(slug)}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: 1, blocks }),
        }),
        !isTemplate && fetch("/api/themes/config", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokens),
        }),
      ].filter(Boolean));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setAiError(false);
    try {
      const res = await fetch("/api/ai/generate-blocks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, currentBlocks: aiMode === "append" ? blocks : [] }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setAiError(true); return; }
      setBlocks(aiMode === "replace" ? data.blocks : [...blocks, ...data.blocks]);
      setAiPrompt(""); setShowAI(false);
    } catch { setAiError(true); }
    finally { setGenerating(false); }
  };

  const canvasWidth = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px";
  const templateLabel = templatePart === "header" ? "Header Template" : templatePart === "footer" ? "Footer Template" : pageTitle;

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    root: { display: "flex", flexDirection: "column" as const, height: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: "13px", background: "#1d2327", color: "#e0e0e0" },
    toolbar: { height: "52px", background: "#1d2327", borderBottom: "1px solid #3c434a", display: "flex", alignItems: "center", padding: "0 16px", gap: "10px", flexShrink: 0, zIndex: 10 },
    body: { flex: 1, display: "flex", overflow: "hidden" },
    left: { width: "300px", background: "#2c3338", borderRight: "1px solid #3c434a", display: "flex", flexDirection: "column" as const, flexShrink: 0 },
    canvas: { flex: 1, background: "#111", overflow: "auto", display: "flex", justifyContent: "center", padding: "24px" },
    tab: (active: boolean): React.CSSProperties => ({ flex: 1, padding: "10px 0", textAlign: "center", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: active ? "#72aee6" : "#a7aaad", background: "none", border: "none", borderBottom: `2px solid ${active ? "#72aee6" : "transparent"}` }),
    panelBody: { flex: 1, overflow: "auto", padding: "16px" } as React.CSSProperties,
    btn: (primary = false): React.CSSProperties => ({ height: "30px", padding: "0 14px", borderRadius: "3px", border: primary ? "1px solid #0a4b78" : "1px solid #50575e", background: primary ? "#2271b1" : "#3c434a", color: primary ? "#fff" : "#e0e0e0", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }),
    devBtn: (active: boolean): React.CSSProperties => ({ padding: "5px 12px", borderRadius: "3px", border: "none", background: active ? "#50575e" : "transparent", color: active ? "#fff" : "#a7aaad", cursor: "pointer", fontSize: "12px" }),
    backBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", borderBottom: "1px solid #3c434a", cursor: "pointer", color: "#a7aaad", fontSize: "12px", background: "none", border: "none", width: "100%", textAlign: "left" as const, borderBottom2: "1px solid #3c434a" } as React.CSSProperties,
  };

  // ── Left Panel Content ────────────────────────────────────────────────────
  function renderLeft() {
    // ── Theme Mode ──
    if (leftPanel === "theme") {
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #3c434a", padding: "0" }}>
            <button onClick={() => setLeftPanel("palette")} style={{ ...S.backBtn, padding: "12px 16px", borderBottom: "none", width: "auto", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </button>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#e0e0e0", flex: 1, textAlign: "center", paddingRight: "16px" }}>Global Style</span>
          </div>
          <div style={S.panelBody}>
            <ThemePanel tokens={tokens} onChange={setTokens} />
          </div>
        </>
      );
    }

    // ── Block Settings Mode ──
    if (leftPanel === "block" && selectedBlock) {
      const blockLabel = selectedBlock.type.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return (
        <>
          {/* Block panel header */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #3c434a", flexShrink: 0 }}>
            <button onClick={deselectBlock} style={{ ...S.backBtn, padding: "12px 16px", borderBottom: "none", width: "auto", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              Elements
            </button>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#72aee6", flex: 1, textAlign: "center", paddingRight: "8px", textTransform: "capitalize" }}>{blockLabel}</span>
          </div>

          {/* Content / Style tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #3c434a", flexShrink: 0 }}>
            <button style={S.tab(blockTab === "content")} onClick={() => setBlockTab("content")}>Content</button>
            <button style={S.tab(blockTab === "style")} onClick={() => setBlockTab("style")}>Style</button>
          </div>

          {/* Panel body */}
          <div style={S.panelBody}>
            {blockTab === "content"
              ? <BlockContent block={selectedBlock} onChange={props => updateBlock(selectedBlock.id, props)} forms={forms} />
              : <BlockStyle block={selectedBlock} onChange={props => updateBlock(selectedBlock.id, props)} />
            }
          </div>

          {/* Block actions footer */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #3c434a", display: "flex", gap: "6px", flexShrink: 0 }}>
            <button style={{ ...S.btn(), flex: 1 }} onClick={() => duplicateBlock(selectedBlock.id)}>Duplicate</button>
            <button style={{ ...S.btn(), flex: 1, color: "#f87171", borderColor: "#4a2222" }} onClick={() => deleteBlock(selectedBlock.id)}>Delete</button>
          </div>
        </>
      );
    }

    // ── Palette / Navigator Mode (default) ──
    return (
      <>
        <div style={{ display: "flex", borderBottom: "1px solid #3c434a", flexShrink: 0 }}>
          <button style={S.tab(paletteTab === "elements")} onClick={() => setPaletteTab("elements")}>Elements</button>
          <button style={S.tab(paletteTab === "navigator")} onClick={() => setPaletteTab("navigator")}>Navigator</button>
        </div>
        <div style={S.panelBody}>
          {paletteTab === "elements" ? (
            <div>
              <p style={{ fontSize: "11px", color: "#8c8f94", margin: "0 0 10px" }}>Click to insert after selected block</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {palette.map(item => (
                  <button key={item.type} onClick={() => addBlock(item.type)}
                    style={{ textAlign: "left", background: "#1d2327", border: "1px solid #3c434a", borderRadius: "4px", padding: "10px", cursor: "pointer", color: "#e0e0e0" }}>
                    <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}>{item.label}</div>
                    <div style={{ fontSize: "10px", color: "#8c8f94", lineHeight: 1.4 }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {blocks.length === 0 && <p style={{ color: "#8c8f94", fontSize: "12px" }}>No blocks yet. Add from Elements.</p>}
              {blocks.map((b, i) => (
                <div key={b.id}
                  onClick={() => selectBlock(b.id)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", marginBottom: "3px", borderRadius: "4px", background: selectedId === b.id ? "#0a4b78" : "transparent", cursor: "pointer", border: `1px solid ${selectedId === b.id ? "#2271b1" : "transparent"}` }}>
                  <span style={{ fontSize: "10px", color: "#646970", width: "16px", textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, flex: 1, textTransform: "capitalize", color: "#e0e0e0" }}>{b.type.replace(/-/g, " ")}</span>
                  <div style={{ display: "flex", gap: "1px" }}>
                    <button onClick={e => { e.stopPropagation(); moveBlock(b.id, "up"); }} style={{ background: "none", border: "none", color: "#8c8f94", cursor: "pointer", padding: "2px 5px", fontSize: "11px" }} disabled={i === 0}>▲</button>
                    <button onClick={e => { e.stopPropagation(); moveBlock(b.id, "down"); }} style={{ background: "none", border: "none", color: "#8c8f94", cursor: "pointer", padding: "2px 5px", fontSize: "11px" }} disabled={i === blocks.length - 1}>▼</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div style={S.root}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <a href="/admin/themes" style={{ color: "#a7aaad", textDecoration: "none", fontSize: "12px", marginRight: "4px", flexShrink: 0 }}>← Themes</a>
        <div style={{ width: "1px", height: "20px", background: "#3c434a", flexShrink: 0 }} />
        {isTemplate && <span style={{ fontSize: "11px", background: "#7c3aed", color: "#fff", padding: "2px 8px", borderRadius: "3px", fontWeight: 600, flexShrink: 0 }}>{templatePart?.toUpperCase()}</span>}
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e0e0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{templateLabel}</span>
        <div style={{ flex: 1 }} />

        {/* Device switcher */}
        {!isTemplate && (
          <div style={{ display: "flex", background: "#111", borderRadius: "4px", padding: "2px", flexShrink: 0 }}>
            {(["desktop", "tablet", "mobile"] as const).map(d => (
              <button key={d} style={S.devBtn(device === d)} onClick={() => setDevice(d)}>
                {d === "desktop" ? "🖥" : d === "tablet" ? "⬜" : "📱"}
              </button>
            ))}
          </div>
        )}

        {/* Global Style button */}
        {!isTemplate && (
          <button
            style={{ ...S.btn(), background: leftPanel === "theme" ? "#50575e" : "#3c434a", border: leftPanel === "theme" ? "1px solid #72aee6" : "1px solid #50575e", flexShrink: 0 }}
            onClick={() => { setLeftPanel(leftPanel === "theme" ? "palette" : "theme"); setSelectedId(null); }}
          >
            Global Style
          </button>
        )}

        {/* AI Generate */}
        {!isTemplate && (
          <button style={{ ...S.btn(), background: "#7c3aed", border: "1px solid #6d28d9", color: "#fff", flexShrink: 0 }} onClick={() => setShowAI(true)}>AI Generate</button>
        )}

        {/* Save */}
        <button style={S.btn(true)} onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>

        {/* Preview */}
        {!isTemplate && (
          <a href={`${siteUrl}/${slug}`} target="_blank" rel="noopener" style={{ ...S.btn(), textDecoration: "none", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>Preview ↗</a>
        )}
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Left Panel — Elementor-style context panel */}
        <div style={S.left}>{renderLeft()}</div>

        {/* Canvas */}
        <div style={S.canvas} onClick={deselectBlock}>
          <div style={{ width: canvasWidth, maxWidth: "100%", background: "#fff", minHeight: "100%", boxShadow: "0 4px 32px rgba(0,0,0,0.4)", transition: "width 0.2s" }}>
            {blocks.length === 0 && (
              <div style={{ padding: "80px 40px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.3 }}>□</div>
                <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "#64748b" }}>{isTemplate ? `Empty ${templatePart || "template"}` : "Empty Page"}</div>
                <div style={{ fontSize: "13px" }}>Add blocks from the <strong>Elements</strong> panel{!isTemplate ? " or click <strong>AI Generate</strong>" : ""}.</div>
              </div>
            )}
            {blocks.map((block, i) => {
              const isSelected = selectedId === block.id;
              return (
                <div key={block.id}
                  onClick={e => { e.stopPropagation(); selectBlock(block.id); }}
                  style={{ position: "relative", outline: isSelected ? "2px solid #2271b1" : "2px solid transparent", outlineOffset: "-2px", cursor: "default", transition: "outline-color 0.1s" }}>
                  <BlockPreview block={block} tokens={tokens} forms={forms} isSelected={isSelected}
                    onPropChange={(key, val) => updateBlock(block.id, { ...block.props, [key]: val })}
                    onReplace={newBlock => replaceBlock(block.id, newBlock)}
                  />
                  {isSelected && (
                    <>
                      <div style={{ position: "absolute", top: "8px", left: "8px", background: "#2271b1", color: "#fff", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "3px", textTransform: "capitalize", pointerEvents: "none", letterSpacing: "0.3px" }}>
                        {block.type.replace(/-/g, " ")}
                      </div>
                      <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "4px", zIndex: 10 }}>
                        <button onClick={e => { e.stopPropagation(); moveBlock(block.id, "up"); }} style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "3px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "#1d2327" }} disabled={i === 0}>▲</button>
                        <button onClick={e => { e.stopPropagation(); moveBlock(block.id, "down"); }} style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "3px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "#1d2327" }} disabled={i === blocks.length - 1}>▼</button>
                        <button onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }} style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "3px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "#1d2327" }} title="Duplicate">⧉</button>
                        <button onClick={e => { e.stopPropagation(); deleteBlock(block.id); }} style={{ background: "#fff", border: "1px solid #d63638", borderRadius: "3px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "#d63638" }} title="Delete">✕</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAI && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowAI(false)}>
          <div style={{ background: "#2c3338", border: "1px solid #3c434a", borderRadius: "8px", padding: "28px", width: "520px", maxWidth: "90vw", color: "#e0e0e0" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#fff" }}>AI Page Generator</h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#a7aaad" }}>Describe the layout and AI will generate blocks for you.</p>
            <label style={{ ...lbl, color: "#a7aaad" }}>Prompt</label>
            <textarea style={{ ...inp, resize: "vertical", marginBottom: "16px" }} rows={4} placeholder="e.g. A SaaS landing page with dark hero, 3-column features, and a CTA" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && e.metaKey && generateWithAI()} />
            <label style={{ ...lbl, color: "#a7aaad" }}>Mode</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {(["append", "replace"] as const).map(m => (
                <button key={m} onClick={() => setAiMode(m)} style={{ flex: 1, padding: "8px", border: `1px solid ${aiMode === m ? "#7c3aed" : "#3c434a"}`, borderRadius: "4px", background: aiMode === m ? "#4c1d95" : "#1d2327", color: aiMode === m ? "#fff" : "#a7aaad", cursor: "pointer", fontSize: "13px" }}>
                  {m === "append" ? "Add to page" : "Replace page"}
                </button>
              ))}
            </div>
            {aiError && <div style={{ background: "#4c1313", border: "1px solid #d63638", borderRadius: "4px", padding: "8px 12px", marginBottom: "12px", fontSize: "13px", color: "#fca5a5" }}>Generation failed. Check your AI settings and try again.</div>}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button style={S.btn()} onClick={() => setShowAI(false)}>Cancel</button>
              <button style={{ ...S.btn(true), background: "#7c3aed", borderColor: "#6d28d9" }} onClick={generateWithAI} disabled={generating || !aiPrompt.trim()}>
                {generating ? "Generating…" : "Generate Layout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
