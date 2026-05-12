import { useState, useEffect, Component } from "react";
import type { ReactNode } from "react";
import { BlockEditorProvider, BlockList, BlockTools, useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { SlotFillProvider, Popover, PanelBody, SelectControl, Placeholder, Spinner } from "@wordpress/components";
import { registerCoreBlocks } from "@wordpress/block-library";
import { parse, serialize, registerBlockType, getBlockType } from "@wordpress/blocks";

import "@wordpress/block-editor/build-style/style.css";
import "@wordpress/components/build-style/style.css";
import "@wordpress/block-library/build-style/style.css";
import "@wordpress/block-library/build-style/editor.css";
import "@wordpress/block-library/build-style/theme.css";

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
          instructions="Select a form from the block settings panel on the right."
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
            <span style={{ fontSize: 16 }}>📋</span>
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
    description: "Embed a WPForms form on this page.",
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
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#646970", fontSize: 13 }}>
        Loading editor…
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="gutenberg-editor-wrap">
        <SlotFillProvider>
          <BlockEditorProvider
            value={blocks}
            onInput={handleChange}
            onChange={handleChange}
            settings={{
              hasFixedToolbar: false,
              __experimentalFeatures: {},
              __unstableResolvedAssets: { styles: [] },
            } as any}
          >
            <BlockTools>
              <BlockList />
            </BlockTools>
            <Popover.Slot />
          </BlockEditorProvider>
        </SlotFillProvider>
      </div>
    </ErrorBoundary>
  );
}
