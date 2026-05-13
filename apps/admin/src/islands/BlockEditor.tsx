import { useState, useEffect, useRef, Component } from "react";
import type { ReactNode } from "react";
import {
  BlockEditorProvider,
  BlockList,
  BlockTools,
  BlockInspector,
  WritingFlow,
  ObserveTyping,
  useBlockProps,
  InspectorControls,
} from "@wordpress/block-editor";
import {
  SlotFillProvider,
  Popover,
  PanelBody,
  SelectControl,
  Placeholder,
  Spinner,
  TabPanel,
  TextareaControl,
  Button,
  RadioControl,
} from "@wordpress/components";
import { registerCoreBlocks } from "@wordpress/block-library";
import { parse, serialize, registerBlockType, getBlockType } from "@wordpress/blocks";

import "@wordpress/block-editor/build-style/style.css";
import "@wordpress/components/build-style/style.css";
import "@wordpress/block-library/build-style/style.css";
import "@wordpress/block-library/build-style/editor.css";
import "@wordpress/block-library/build-style/theme.css";

// ─── Extra WordPress-like editor CSS ─────────────────────────────────────────

const EDITOR_CSS = `
  /* === Canvas === */
  .ap-editor-canvas {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: #fff;
    position: relative;
  }
  .ap-editor-canvas .editor-styles-wrapper {
    min-height: 100%;
    padding: 56px 0 120px;
  }
  .ap-editor-canvas .block-editor-block-list__layout.is-root-container {
    max-width: 840px;
    margin: 0 auto;
    padding: 0 40px;
  }
  .ap-editor-canvas .block-editor-default-block-appender__content {
    color: #b5bcc2;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
  }
  .ap-editor-canvas .block-editor-writing-flow {
    outline: none;
  }

  /* === Toolbar === */
  .ap-editor-canvas .block-editor-block-contextual-toolbar {
    border: 1px solid #dcdcde;
    border-radius: 2px;
    box-shadow: 0 2px 6px rgba(0,0,0,.1);
    background: #fff;
  }
  .ap-editor-canvas .components-toolbar-group {
    border-right: 1px solid #dcdcde;
  }
  .ap-editor-canvas .components-toolbar-group:last-child {
    border-right: none;
  }
  .ap-editor-canvas .components-button.has-icon {
    min-width: 36px;
    height: 36px;
    border-radius: 2px;
  }
  .ap-editor-canvas .components-button.has-icon:hover {
    background: #f0f0f0;
  }
  .ap-editor-canvas .components-button.is-pressed {
    background: #1d2327;
    color: #fff;
  }

  /* === Block inserter === */
  .ap-editor-canvas .block-editor-inserter__toggle.components-button {
    color: #007cba;
  }
  .ap-editor-canvas .block-editor-block-list__insertion-point-inserter .block-editor-inserter__toggle {
    background: #007cba;
    color: #fff;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    min-width: unset;
    padding: 0;
  }

  /* === Popover / inserter dropdown === */
  .components-popover.block-editor-inserter__popover {
    z-index: 999999;
  }
  .block-editor-inserter__main-area {
    width: 340px;
  }
  .block-editor-inserter__search-input {
    border: 1px solid #949494;
    border-radius: 2px;
    font-size: 13px;
    padding: 8px 10px;
  }
  .block-editor-block-types-list__list-item .block-editor-block-types-list__item {
    border-radius: 2px;
    padding: 12px 8px;
  }
  .block-editor-block-types-list__item:hover,
  .block-editor-block-types-list__item:focus {
    background: #f0f6fc;
    border-color: #72aee6;
  }
  .block-editor-block-types-list__item-icon {
    width: 36px;
    height: 36px;
    margin: 0 auto 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1d2327;
    border-radius: 4px;
    color: #fff;
  }
  .block-editor-block-types-list__item-icon svg {
    fill: #fff;
    width: 24px;
    height: 24px;
  }
  .block-editor-block-types-list__item-title {
    font-size: 12px;
    text-align: center;
    font-weight: 400;
  }

  /* === Selected block outline === */
  .ap-editor-canvas .block-editor-block-list__block.is-selected > .block-editor-block-list__block-selection-button {
    background: #007cba;
    color: #fff;
  }
  .ap-editor-canvas [data-block].is-selected {
    outline: none;
  }
  .ap-editor-canvas [data-block]:focus {
    outline: none;
  }

  /* === Inspector sidebar === */
  .ap-inspector {
    width: 281px;
    flex-shrink: 0;
    border-left: 1px solid #dcdcde;
    background: #fff;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .ap-inspector-header {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 16px;
    border-bottom: 1px solid #dcdcde;
    font-size: 13px;
    font-weight: 600;
    color: #1d2327;
    background: #fff;
    flex-shrink: 0;
    gap: 1px;
  }
  .ap-inspector-tab {
    height: 48px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    color: #646970;
    border-bottom: 3px solid transparent;
    margin-bottom: -1px;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: inherit;
  }
  .ap-inspector-tab.is-active {
    color: #1d2327;
    border-bottom-color: #3858e9;
    font-weight: 600;
  }
  .ap-inspector-tab:hover {
    color: #1d2327;
  }
  .ap-inspector-body {
    flex: 1;
    overflow-y: auto;
  }
  .ap-inspector-body .block-editor-inspector-controls {
    padding-bottom: 24px;
  }
  .ap-inspector-empty {
    padding: 32px 16px;
    text-align: center;
    color: #646970;
    font-size: 13px;
  }
  .ap-inspector-empty svg {
    display: block;
    margin: 0 auto 12px;
    opacity: 0.4;
    width: 36px;
    height: 36px;
  }

  /* === Components within inspector === */
  .ap-inspector .components-panel__body {
    border-bottom: 1px solid #dcdcde;
    padding: 0;
  }
  .ap-inspector .components-panel__body-toggle.components-button {
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #1d2327;
    width: 100%;
    text-align: left;
    border-radius: 0;
    height: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ap-inspector .components-panel__body.is-opened .components-panel__body-toggle {
    border-bottom: 1px solid #dcdcde;
  }
  .ap-inspector .components-panel__body-content {
    padding: 16px;
  }
  .ap-inspector .components-base-control__label {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #646970;
    margin-bottom: 8px;
  }
  .ap-inspector .components-range-control__wrapper {
    gap: 8px;
  }
  .ap-inspector .components-color-palette__item {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }
  .ap-inspector select,
  .ap-inspector input[type="text"],
  .ap-inspector input[type="number"],
  .ap-inspector input[type="url"] {
    border: 1px solid #949494;
    border-radius: 2px;
    font-size: 13px;
    padding: 6px 8px;
    width: 100%;
    box-sizing: border-box;
  }
  .ap-inspector select:focus,
  .ap-inspector input:focus {
    border-color: #007cba;
    box-shadow: 0 0 0 1px #007cba;
    outline: none;
  }

  /* === General WordPress block styles === */
  .ap-editor-canvas p { margin: 0 0 1em; }
  .ap-editor-canvas h1, .ap-editor-canvas h2, .ap-editor-canvas h3,
  .ap-editor-canvas h4, .ap-editor-canvas h5, .ap-editor-canvas h6 {
    margin: 1.5em 0 0.5em;
    line-height: 1.3;
  }
  .ap-editor-canvas .wp-block {
    max-width: 100%;
  }

  /* Icon fill fix for block inserter */
  .block-editor-block-types-list__item-icon svg,
  .block-editor-block-types-list__item-icon .dashicon {
    fill: currentColor;
  }
`;

// ─── Error boundary ──────────────────────────────────────────────────────────

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 4, fontSize: 13, color: "#856404" }}>
          <strong>Editor error:</strong> {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Form Block ──────────────────────────────────────────────────────────────

function FormBlockEdit({ attributes, setAttributes }: { attributes: any; setAttributes: (a: any) => void }) {
  const blockProps = useBlockProps();
  const [forms, setForms] = useState<Array<{ id: string; title?: string; name?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forms")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setForms(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const options = [
    { label: "— Select a form —", value: "" },
    ...forms.map(f => ({ label: f.title ?? f.name ?? f.id, value: f.id })),
  ];

  const selectedForm = forms.find(f => f.id === attributes.formId);
  const formLabel = selectedForm ? (selectedForm.title ?? selectedForm.name ?? selectedForm.id) : null;

  return (
    <div {...blockProps}>
      <InspectorControls>
        <PanelBody title="Form Settings" initialOpen>
          {loading ? (
            <div style={{ padding: "12px 0" }}><Spinner /></div>
          ) : (
            <SelectControl
              label="Select Form"
              value={attributes.formId ?? ""}
              options={options}
              onChange={(val: string) => {
                const f = forms.find(x => x.id === val);
                setAttributes({ formId: val, formTitle: f ? (f.title ?? f.name ?? "") : "" });
              }}
            />
          )}
          {attributes.formId && (
            <p style={{ fontSize: 12, color: "#646970", margin: "8px 0 0" }}>
              Public URL: <a href={`/forms/${attributes.formId}`} target="_blank" rel="noopener" style={{ color: "#2271b1" }}>/forms/{attributes.formId}</a>
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      {!attributes.formId ? (
        <Placeholder
          icon="feedback"
          label="Form"
          instructions="Select a form from the Block settings on the right."
        >
          {loading ? (
            <Spinner />
          ) : forms.length === 0 ? (
            <p style={{ fontSize: 13, margin: 0 }}>
              No forms yet. <a href="/admin/forms/create" target="_blank" style={{ color: "#2271b1" }}>Create a form</a> first.
            </p>
          ) : (
            <SelectControl
              value=""
              options={options}
              onChange={(val: string) => {
                const f = forms.find(x => x.id === val);
                setAttributes({ formId: val, formTitle: f ? (f.title ?? f.name ?? "") : "" });
              }}
            />
          )}
        </Placeholder>
      ) : (
        <div style={{ border: "1px dashed #2271b1", borderRadius: 4, padding: "16px 20px", background: "#f0f6fc", fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2271b1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
            <strong style={{ color: "#1d2327" }}>{formLabel}</strong>
          </div>
          <p style={{ margin: 0, color: "#646970" }}>
            Form will render here on the front end.{" "}
            <a href={`/admin/forms/${attributes.formId}`} target="_blank" style={{ color: "#2271b1" }}>Edit form</a>
            {" · "}
            <a href={`/forms/${attributes.formId}`} target="_blank" style={{ color: "#2271b1" }}>Preview</a>
          </p>
        </div>
      )}
    </div>
  );
}

function registerFormBlock() {
  if (getBlockType("astropress/form")) return;
  registerBlockType("astropress/form", {
    title: "Form",
    description: "Embed an AstroPress form on this page.",
    icon: "feedback",
    category: "common",
    attributes: {
      formId: { type: "string", default: "" },
      formTitle: { type: "string", default: "" },
    },
    edit: FormBlockEdit,
    save: ({ attributes }: { attributes: any }) => {
      if (!attributes.formId) return null;
      return <div className="wp-block-astropress-form" data-form-id={attributes.formId}></div>;
    },
    deprecated: [
      {
        attributes: {
          formId: { type: "string", default: "" },
          formTitle: { type: "string", default: "" },
        },
        save: ({ attributes }: { attributes: any }) => {
          if (!attributes.formId) return null;
          return (
            <div className="wp-block-astropress-form" data-form-id={attributes.formId}>
              <iframe
                src={`/forms/${attributes.formId}`}
                style={{ width: "100%", border: "none", minHeight: "500px", display: "block" }}
                title={attributes.formTitle || "Form"}
                loading="lazy"
              />
            </div>
          );
        },
      },
    ],
  } as any);
}

// ─── AI Writer Block ──────────────────────────────────────────────────────────

const AI_WRITER_CSS = `
  .ap-ai-writer-block {
    border: 1px solid #2271b1;
    border-radius: 4px;
    background: #fff;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .ap-ai-writer-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: #f0f6fc;
    border-bottom: 1px solid #c5d9f0;
  }
  .ap-ai-writer-header svg { color: #2271b1; flex-shrink: 0; }
  .ap-ai-writer-title {
    font-size: 12px;
    font-weight: 600;
    color: #2271b1;
    flex: 1;
  }
  .ap-ai-writer-prompt-area {
    padding: 14px;
    border-bottom: 1px solid #e0e8f0;
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  .ap-ai-writer-prompt-area textarea {
    flex: 1;
    min-height: 60px;
    border: 1px solid #8c8f94;
    border-radius: 3px;
    font-size: 13px;
    padding: 8px 10px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }
  .ap-ai-writer-prompt-area textarea:focus {
    border-color: #2271b1;
    box-shadow: 0 0 0 1px #2271b1;
  }
  .ap-ai-writer-btn {
    height: 32px;
    padding: 0 14px;
    background: #2271b1;
    color: #fff;
    border: none;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .ap-ai-writer-btn:hover { background: #135e96; }
  .ap-ai-writer-btn:disabled { opacity: 0.6; cursor: not-allowed; background: #2271b1; }
  .ap-ai-writer-btn.secondary {
    background: #fff;
    color: #2271b1;
    border: 1px solid #2271b1;
  }
  .ap-ai-writer-btn.secondary:hover { background: #f0f6fc; }
  .ap-ai-writer-content-area {
    padding: 20px 24px;
    min-height: 80px;
    font-size: 15px;
    line-height: 1.7;
    color: #1d2327;
    outline: none;
  }
  .ap-ai-writer-content-area[contenteditable="true"]:focus {
    outline: none;
  }
  .ap-ai-writer-content-area h1,
  .ap-ai-writer-content-area h2,
  .ap-ai-writer-content-area h3 { margin: 1em 0 0.5em; line-height: 1.3; }
  .ap-ai-writer-content-area p { margin: 0 0 1em; }
  .ap-ai-writer-content-area ul,
  .ap-ai-writer-content-area ol { margin: 0 0 1em; padding-left: 1.5em; }
  .ap-ai-writer-content-area strong { font-weight: 600; }
  .ap-ai-writer-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-top: 1px solid #e0e8f0;
    background: #fafafa;
  }
  .ap-ai-writer-status {
    font-size: 11px;
    color: #646970;
    flex: 1;
  }
  .ap-ai-writer-status.error { color: #d63638; }
  .ap-ai-writer-generating {
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #646970;
    font-size: 13px;
  }
`;

function AIWriterBlockEdit({ attributes, setAttributes }: { attributes: any; setAttributes: (a: any) => void }) {
  const blockProps = useBlockProps({ className: "ap-ai-writer-block" });
  const [prompt, setPrompt] = useState(attributes.prompt ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [tone, setTone] = useState(attributes.tone ?? "professional");
  const contentRef = useRef<HTMLDivElement>(null);

  // Inject block CSS once
  useEffect(() => {
    if (document.getElementById("ap-ai-writer-css")) return;
    const style = document.createElement("style");
    style.id = "ap-ai-writer-css";
    style.textContent = AI_WRITER_CSS;
    document.head.appendChild(style);
  }, []);

  // Sync content to DOM when attribute changes externally
  useEffect(() => {
    if (contentRef.current && attributes.content && contentRef.current.innerHTML !== attributes.content) {
      contentRef.current.innerHTML = attributes.content;
    }
  }, [attributes.content]);

  const getPostTitle = () => {
    const el = document.querySelector<HTMLInputElement>("#post-title");
    return el?.value?.trim() ?? "";
  };

  const generate = async (isRegenerate = false) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    setGenerating(true);
    setError("");

    const postTitle = getPostTitle();
    const toneNote = tone !== "professional" ? ` Use a ${tone} tone.` : "";
    const regenNote = isRegenerate && attributes.content ? " Rewrite it — make it distinctly different." : "";
    const userMessage = postTitle
      ? `Post title: "${postTitle}". ${trimmedPrompt}${toneNote}${regenNote}`
      : `${trimmedPrompt}${toneNote}${regenNote}`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage }],
          context: { page: "block-editor", postTitle, blockPrompt: trimmedPrompt },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI request failed");

      // Strip any action blocks from the reply — only keep HTML content
      let html = (data.reply as string)
        .replace(/```action[\s\S]*?```/g, "")
        .trim();

      // If the AI returned a setContent action, extract the HTML from it
      const actionMatch = html.match(/\{"type":"setContent","html":"([\s\S]*?)"\}/);
      if (actionMatch) {
        try { html = JSON.parse(`"${actionMatch[1]}"`); } catch {}
      }

      // If the reply is not HTML (starts with text), wrap it
      if (!html.startsWith("<")) {
        html = `<p>${html.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
      }

      setAttributes({ content: html, prompt: trimmedPrompt, tone });
      if (contentRef.current) contentRef.current.innerHTML = html;
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleContentEdit = () => {
    if (contentRef.current) {
      setAttributes({ content: contentRef.current.innerHTML });
    }
  };

  const hasContent = !!attributes.content;

  return (
    <div {...blockProps}>
      <InspectorControls>
        <PanelBody title="AI Writer Settings" initialOpen>
          <RadioControl
            label="Tone"
            selected={tone}
            options={[
              { label: "Professional", value: "professional" },
              { label: "Conversational", value: "conversational" },
              { label: "Persuasive", value: "persuasive" },
              { label: "Concise", value: "concise" },
            ]}
            onChange={(val: string) => { setTone(val); setAttributes({ tone: val }); }}
          />
        </PanelBody>
      </InspectorControls>

      {/* Header */}
      <div className="ap-ai-writer-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
        </svg>
        <span className="ap-ai-writer-title">AI Writer</span>
        {hasContent && !generating && (
          <span style={{ fontSize: 11, color: "#00a32a", fontWeight: 600 }}>Content generated</span>
        )}
      </div>

      {/* Prompt row */}
      <div className="ap-ai-writer-prompt-area">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={hasContent ? "Describe changes or a new direction…" : "What should this section be about? e.g. 'Write an intro about our product benefits'"}
          disabled={generating}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generate(hasContent); } }}
        />
        <button
          className="ap-ai-writer-btn"
          onClick={() => generate(hasContent)}
          disabled={generating || !prompt.trim()}
        >
          {generating ? (
            <>
              <Spinner style={{ margin: 0, width: 16, height: 16 }} />
              Generating…
            </>
          ) : hasContent ? "Rewrite" : "Generate"}
        </button>
      </div>

      {/* Content area */}
      {generating && !hasContent ? (
        <div className="ap-ai-writer-generating">
          <Spinner />
          Writing content…
        </div>
      ) : hasContent ? (
        <>
          <div
            ref={contentRef}
            className="ap-ai-writer-content-area"
            contentEditable
            suppressContentEditableWarning
            onBlur={handleContentEdit}
            dangerouslySetInnerHTML={{ __html: attributes.content }}
          />
          <div className="ap-ai-writer-footer">
            <span className={`ap-ai-writer-status${error ? " error" : ""}`}>
              {error || "Edit directly or rewrite with a new prompt. Press ⌘+Enter to generate."}
            </span>
            <button
              className="ap-ai-writer-btn secondary"
              style={{ height: 26, fontSize: 11 }}
              onClick={() => { setAttributes({ content: "", prompt: "" }); setPrompt(""); if (contentRef.current) contentRef.current.innerHTML = ""; }}
            >
              Clear
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: "12px 14px", fontSize: 12, color: "#646970" }}>
          {error ? (
            <span style={{ color: "#d63638" }}>{error}</span>
          ) : (
            "Enter a prompt above and click Generate to create content with AI."
          )}
        </div>
      )}
    </div>
  );
}

function registerAIWriterBlock() {
  if (getBlockType("astropress/ai-writer")) return;
  registerBlockType("astropress/ai-writer", {
    title: "AI Writer",
    description: "Generate and edit content using AI.",
    icon: "edit",
    category: "common",
    attributes: {
      content: { type: "string", default: "" },
      prompt:  { type: "string", default: "" },
      tone:    { type: "string", default: "professional" },
    },
    edit: AIWriterBlockEdit,
    save: ({ attributes }: { attributes: any }) => {
      if (!attributes.content) return null;
      return <div className="wp-block-astropress-ai-writer" dangerouslySetInnerHTML={{ __html: attributes.content }} />;
    },
  } as any);
}

// ─── Inspector sidebar ────────────────────────────────────────────────────────

function InspectorSidebar() {
  const [activeTab, setActiveTab] = useState<"block" | "document">("block");

  return (
    <div className="ap-inspector">
      <div className="ap-inspector-header">
        <button
          className={`ap-inspector-tab${activeTab === "block" ? " is-active" : ""}`}
          onClick={() => setActiveTab("block")}
        >
          Block
        </button>
        <button
          className={`ap-inspector-tab${activeTab === "document" ? " is-active" : ""}`}
          onClick={() => setActiveTab("document")}
        >
          Document
        </button>
      </div>
      <div className="ap-inspector-body">
        {activeTab === "block" ? (
          <BlockInspector
            noBlockSelectedMessage={
              <div className="ap-inspector-empty">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 8H5c-1.7 0-3 1.3-3 3v6h4v4l4-4h9c1.7 0 3-1.3 3-3v-6c0-1.7-1.3-3-3-3zm1 9c0 .8-.7 1.5-1.5 1.5H9.4l-.4.4V17H4v-6c0-.8.7-1.5 1.5-1.5h13c.8 0 1.5.7 1.5 1.5v6z" fill="currentColor"/></svg>
                <p style={{ margin: 0, fontSize: 13, color: "#646970" }}>
                  Select a block to see<br />its settings
                </p>
              </div>
            }
          />
        ) : (
          <div className="ap-inspector-empty">
            <p style={{ margin: 0, fontSize: 13, color: "#646970" }}>
              Document settings are in<br />the sidebar on the right.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  initialContent?: string;
  postId?: number;
}

// ─── Editor ──────────────────────────────────────────────────────────────────

let blocksRegistered = false;

export default function BlockEditor({ initialContent = "" }: Props) {
  const [ready, setReady] = useState(false);
  const [blocks, setBlocks] = useState<ReturnType<typeof parse>>([]);

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("ap-editor-css")) return;
    const style = document.createElement("style");
    style.id = "ap-editor-css";
    style.textContent = EDITOR_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!blocksRegistered) {
      registerCoreBlocks();
      registerFormBlock();
      registerAIWriterBlock();
      blocksRegistered = true;
    }
    const parsed = parse(initialContent || "");
    setBlocks(parsed);
    (window as any).__editorContent = initialContent || "";
    setReady(true);

    // Signal AIWidget that the editor is ready to receive content
    window.dispatchEvent(new CustomEvent("ap:editorReady"));

    // Listen for AI widget setContent requests
    const handleSetContent = (e: Event) => {
      const html = (e as CustomEvent<{ html: string }>).detail?.html;
      if (html) {
        const newBlocks = parse(html);
        setBlocks(newBlocks);
        (window as any).__editorContent = html;
      }
    };
    window.addEventListener("ap:setContent", handleSetContent);
    return () => window.removeEventListener("ap:setContent", handleSetContent);
  }, []);

  const handleChange = (newBlocks: ReturnType<typeof parse>) => {
    setBlocks(newBlocks);
    (window as any).__editorContent = serialize(newBlocks);
  };

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#646970", fontSize: 13, gap: 10 }}>
        <Spinner />
        Loading editor…
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SlotFillProvider>
        <BlockEditorProvider
          value={blocks}
          onInput={handleChange}
          onChange={handleChange}
          settings={{
            hasFixedToolbar: false,
            bodyPlaceholder: "Start writing or type / to choose a block",
            titlePlaceholder: "Add title",
            __experimentalFeatures: {
              typography: { dropCap: true, fontSizes: true, customFontSize: true },
              color: { text: true, background: true, link: true },
            },
            __unstableResolvedAssets: { styles: [] },
          } as any}
        >
          {/* Two-panel layout: canvas + block inspector */}
          <div style={{
            display: "flex",
            height: "100%",
            minHeight: 560,
            overflow: "hidden",
          }}>
            {/* ── Editor canvas ── */}
            <div className="ap-editor-canvas">
              <BlockTools>
                <div className="editor-styles-wrapper" role="region" aria-label="Block editor content">
                  <WritingFlow>
                    <ObserveTyping>
                      <BlockList />
                    </ObserveTyping>
                  </WritingFlow>
                </div>
              </BlockTools>
            </div>

            {/* ── Block inspector ── */}
            <InspectorSidebar />
          </div>

          {/* Popovers rendered outside the flex container to prevent clipping */}
          <Popover.Slot />
        </BlockEditorProvider>
      </SlotFillProvider>
    </ErrorBoundary>
  );
}
