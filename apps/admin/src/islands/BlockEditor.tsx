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
      blocksRegistered = true;
    }
    const parsed = parse(initialContent || "");
    setBlocks(parsed);
    (window as any).__editorContent = initialContent || "";
    setReady(true);
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
