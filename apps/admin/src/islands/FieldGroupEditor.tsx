import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ACFFieldType =
  | "text" | "textarea" | "number" | "range" | "email" | "url" | "password"
  | "image" | "file" | "wysiwyg" | "oembed" | "gallery"
  | "select" | "checkbox" | "radio" | "button_group" | "true_false"
  | "link" | "post_object" | "page_link" | "relationship" | "taxonomy" | "user"
  | "google_map" | "date_picker" | "date_time_picker" | "time_picker" | "color_picker"
  | "message" | "accordion" | "tab"
  | "group" | "repeater" | "flexible_content" | "clone";

interface ACFField {
  id: string;
  key: string;
  label: string;
  name: string;
  type: ACFFieldType;
  instructions: string;
  required: boolean;
  conditionalLogic: any[] | false;
  wrapper: { width: string; class: string; id: string };
  subFields?: ACFField[];
  layouts?: FlexLayout[];
  [key: string]: any;
}

interface FlexLayout {
  id: string;
  key: string;
  label: string;
  name: string;
  display: "block" | "table" | "row";
  min: string;
  max: string;
  subFields: ACFField[];
}

interface FieldGroupLocation {
  param: string;
  operator: "==" | "!=";
  value: string;
}

interface FieldGroup {
  id: string;
  key: string;
  title: string;
  fields: ACFField[];
  location: FieldGroupLocation[][];
  menuOrder: number;
  position: "normal" | "side" | "acf_after_title";
  labelPlacement: "top" | "left";
  instructionPlacement: "label" | "field";
  hideOnScreen: string[];
  active: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

interface FieldTypeMeta {
  label: string;
  icon: string;
  category: string;
}

const FIELD_TYPES: Record<string, FieldTypeMeta> = {
  text:              { label: "Text",             icon: "T",   category: "Basic" },
  textarea:          { label: "Textarea",          icon: "¶",   category: "Basic" },
  number:            { label: "Number",            icon: "#",   category: "Basic" },
  range:             { label: "Range",             icon: "↔",   category: "Basic" },
  email:             { label: "Email",             icon: "@",   category: "Basic" },
  url:               { label: "URL",               icon: "🔗",  category: "Basic" },
  password:          { label: "Password",          icon: "🔒",  category: "Basic" },
  image:             { label: "Image",             icon: "🖼",   category: "Content" },
  file:              { label: "File",              icon: "📎",  category: "Content" },
  wysiwyg:           { label: "WYSIWYG Editor",    icon: "✍",   category: "Content" },
  oembed:            { label: "oEmbed",            icon: "▶",   category: "Content" },
  gallery:           { label: "Gallery",           icon: "🖼🖼", category: "Content" },
  select:            { label: "Select",            icon: "▼",   category: "Choice" },
  checkbox:          { label: "Checkbox",          icon: "☑",   category: "Choice" },
  radio:             { label: "Radio Button",      icon: "⊙",   category: "Choice" },
  button_group:      { label: "Button Group",      icon: "⊞",   category: "Choice" },
  true_false:        { label: "True / False",      icon: "◐",   category: "Choice" },
  link:              { label: "Link",              icon: "🔗",  category: "Relational" },
  post_object:       { label: "Post Object",       icon: "📄",  category: "Relational" },
  page_link:         { label: "Page Link",         icon: "📄",  category: "Relational" },
  relationship:      { label: "Relationship",      icon: "↔",   category: "Relational" },
  taxonomy:          { label: "Taxonomy",          icon: "🏷",  category: "Relational" },
  user:              { label: "User",              icon: "👤",  category: "Relational" },
  google_map:        { label: "Google Map",        icon: "📍",  category: "jQuery" },
  date_picker:       { label: "Date Picker",       icon: "📅",  category: "jQuery" },
  date_time_picker:  { label: "Date Time Picker",  icon: "📅",  category: "jQuery" },
  time_picker:       { label: "Time Picker",       icon: "🕐",  category: "jQuery" },
  color_picker:      { label: "Color Picker",      icon: "🎨",  category: "jQuery" },
  message:           { label: "Message",           icon: "💬",  category: "Layout" },
  accordion:         { label: "Accordion",         icon: "≡",   category: "Layout" },
  tab:               { label: "Tab",               icon: "📑",  category: "Layout" },
  group:             { label: "Group",             icon: "📦",  category: "Pro" },
  repeater:          { label: "Repeater",          icon: "⊞⊞",  category: "Pro" },
  flexible_content:  { label: "Flexible Content",  icon: "⊟",  category: "Pro" },
  clone:             { label: "Clone",             icon: "⧉",   category: "Pro" },
};

const LOCATION_PARAMS = [
  { value: "post_type",         label: "Post Type" },
  { value: "post_status",       label: "Post Status" },
  { value: "current_user_role", label: "Current User Role" },
  { value: "post_format",       label: "Post Format" },
  { value: "taxonomy",          label: "Taxonomy" },
];

const LOCATION_PARAM_VALUES: Record<string, { value: string; label: string }[]> = {
  post_type: [
    { value: "post",       label: "Post" },
    { value: "page",       label: "Page" },
    { value: "attachment", label: "Media" },
  ],
  post_status: [
    { value: "publish", label: "Published" },
    { value: "draft",   label: "Draft" },
    { value: "pending", label: "Pending" },
    { value: "private", label: "Private" },
    { value: "future",  label: "Scheduled" },
  ],
  current_user_role: [
    { value: "administrator", label: "Administrator" },
    { value: "editor",        label: "Editor" },
    { value: "author",        label: "Author" },
    { value: "contributor",   label: "Contributor" },
    { value: "subscriber",    label: "Subscriber" },
  ],
  post_format: [
    { value: "0",       label: "Standard" },
    { value: "aside",   label: "Aside" },
    { value: "gallery", label: "Gallery" },
    { value: "link",    label: "Link" },
    { value: "image",   label: "Image" },
    { value: "quote",   label: "Quote" },
    { value: "status",  label: "Status" },
    { value: "video",   label: "Video" },
    { value: "audio",   label: "Audio" },
    { value: "chat",    label: "Chat" },
  ],
  taxonomy: [
    { value: "category", label: "Category" },
    { value: "post_tag", label: "Tag" },
  ],
};

function createField(type: ACFFieldType = "text"): ACFField {
  return {
    id: uid(),
    key: "field_" + uid(),
    label: "New Field",
    name: "new_field_" + uid().slice(0, 4),
    type,
    instructions: "",
    required: false,
    conditionalLogic: false,
    wrapper: { width: "", class: "", id: "" },
    ...(type === "repeater" || type === "group" ? { subFields: [] } : {}),
    ...(type === "flexible_content" ? { layouts: [] } : {}),
  };
}

function createGroup(): FieldGroup {
  return {
    id: uid(),
    key: "group_" + uid(),
    title: "New Field Group",
    fields: [],
    location: [[{ param: "post_type", operator: "==", value: "post" }]],
    menuOrder: 0,
    position: "normal",
    labelPlacement: "top",
    instructionPlacement: "label",
    hideOnScreen: [],
    active: true,
  };
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const S = {
  input: { width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid #8c8f94", borderRadius: "3px", outline: "none" } as React.CSSProperties,
  select: { width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid #8c8f94", borderRadius: "3px", outline: "none" } as React.CSSProperties,
  label: { fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#1d2327" } as React.CSSProperties,
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" } as React.CSSProperties,
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" } as React.CSSProperties,
  hint: { fontSize: "11px", color: "#646970", marginTop: "3px" } as React.CSSProperties,
  sectionTitle: { fontSize: "11px", fontWeight: 700, color: "#646970", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "10px" },
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
      {hint && <p style={S.hint}>{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
      <span style={{
        display: "inline-block", width: "36px", height: "20px",
        background: checked ? "#2271b1" : "#c3c4c7",
        borderRadius: "10px", position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: "2px", left: checked ? "18px" : "2px",
          width: "16px", height: "16px", background: "#fff",
          borderRadius: "50%", transition: "left 0.2s",
        }} />
      </span>
      {label && <span style={{ color: "#1d2327" }}>{label}</span>}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
    </label>
  );
}

// ─── Choices Editor ───────────────────────────────────────────────────────────

function ChoicesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Choices" hint="Enter each choice on a new line. To specify the value and label separately, use : to divide them. Eg. red : Red">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        style={{ ...S.input, resize: "vertical", fontFamily: "monospace" }}
        placeholder={"red : Red\ngreen : Green\nblue : Blue"}
      />
    </Field>
  );
}

// ─── Post Type Multi-Select (simple checkboxes for known types) ───────────────

function MultiCheckSelect({ value, options, onChange }: {
  value: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((o) => (
        <label key={o.value} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={(e) => {
              if (e.target.checked) onChange([...value, o.value]);
              else onChange(value.filter((v) => v !== o.value));
            }}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// ─── Type-specific Options ────────────────────────────────────────────────────

function TypeOptions({ field, update }: { field: ACFField; update: (patch: Partial<ACFField>) => void }) {
  const u = (k: string, v: any) => update({ [k]: v });
  const t = field.type;

  // Text / Email / URL
  if (["text", "email", "url"].includes(t)) {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row2}>
          <Field label="Default Value"><input style={S.input} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
          <Field label="Placeholder"><input style={S.input} value={field.placeholder ?? ""} onChange={(e) => u("placeholder", e.target.value)} /></Field>
          <Field label="Prepend"><input style={S.input} value={field.prepend ?? ""} onChange={(e) => u("prepend", e.target.value)} /></Field>
          <Field label="Append"><input style={S.input} value={field.append ?? ""} onChange={(e) => u("append", e.target.value)} /></Field>
          {t === "text" && <Field label="Character Limit" hint="Leave blank for no limit"><input style={S.input} type="number" value={field.maxlength ?? ""} onChange={(e) => u("maxlength", e.target.value)} /></Field>}
        </div>
        {t === "text" && (
          <div style={{ display: "flex", gap: "20px" }}>
            <Toggle checked={!!field.readonly} onChange={(v) => u("readonly", v)} label="Read Only" />
            <Toggle checked={!!field.disabled} onChange={(v) => u("disabled", v)} label="Disabled" />
          </div>
        )}
      </div>
    );
  }

  // Textarea
  if (t === "textarea") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row2}>
          <Field label="Default Value"><textarea style={{ ...S.input, resize: "vertical" }} rows={3} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
          <div>
            <Field label="Placeholder"><input style={S.input} value={field.placeholder ?? ""} onChange={(e) => u("placeholder", e.target.value)} /></Field>
            <div style={{ marginTop: "14px" }}>
              <Field label="Rows"><input style={S.input} type="number" value={field.rows ?? 8} onChange={(e) => u("rows", e.target.value)} /></Field>
            </div>
          </div>
          <Field label="New Lines" hint="How to handle new line characters">
            <select style={S.select} value={field.newLines ?? "wpautop"} onChange={(e) => u("newLines", e.target.value)}>
              <option value="wpautop">Automatically add paragraphs</option>
              <option value="br">Automatically add &lt;br&gt;</option>
              <option value="">No Formatting</option>
            </select>
          </Field>
          <Field label="Character Limit"><input style={S.input} type="number" value={field.maxlength ?? ""} onChange={(e) => u("maxlength", e.target.value)} /></Field>
        </div>
      </div>
    );
  }

  // Number
  if (t === "number") {
    return (
      <div style={S.row3}>
        <Field label="Default Value"><input style={S.input} type="number" value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
        <Field label="Placeholder"><input style={S.input} value={field.placeholder ?? ""} onChange={(e) => u("placeholder", e.target.value)} /></Field>
        <Field label="Prepend"><input style={S.input} value={field.prepend ?? ""} onChange={(e) => u("prepend", e.target.value)} /></Field>
        <Field label="Append"><input style={S.input} value={field.append ?? ""} onChange={(e) => u("append", e.target.value)} /></Field>
        <Field label="Min"><input style={S.input} type="number" value={field.min ?? ""} onChange={(e) => u("min", e.target.value)} /></Field>
        <Field label="Max"><input style={S.input} type="number" value={field.max ?? ""} onChange={(e) => u("max", e.target.value)} /></Field>
        <Field label="Step"><input style={S.input} type="number" value={field.step ?? ""} onChange={(e) => u("step", e.target.value)} /></Field>
      </div>
    );
  }

  // Range
  if (t === "range") {
    return (
      <div style={S.row3}>
        <Field label="Default Value"><input style={S.input} type="number" value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
        <Field label="Min"><input style={S.input} type="number" value={field.min ?? 0} onChange={(e) => u("min", e.target.value)} /></Field>
        <Field label="Max"><input style={S.input} type="number" value={field.max ?? 100} onChange={(e) => u("max", e.target.value)} /></Field>
        <Field label="Step"><input style={S.input} type="number" value={field.step ?? 1} onChange={(e) => u("step", e.target.value)} /></Field>
        <Field label="Prepend"><input style={S.input} value={field.prepend ?? ""} onChange={(e) => u("prepend", e.target.value)} /></Field>
        <Field label="Append"><input style={S.input} value={field.append ?? ""} onChange={(e) => u("append", e.target.value)} /></Field>
      </div>
    );
  }

  // Password
  if (t === "password") {
    return (
      <div style={S.row3}>
        <Field label="Placeholder"><input style={S.input} value={field.placeholder ?? ""} onChange={(e) => u("placeholder", e.target.value)} /></Field>
        <Field label="Prepend"><input style={S.input} value={field.prepend ?? ""} onChange={(e) => u("prepend", e.target.value)} /></Field>
        <Field label="Append"><input style={S.input} value={field.append ?? ""} onChange={(e) => u("append", e.target.value)} /></Field>
      </div>
    );
  }

  // Image
  if (t === "image") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row3}>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "array"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="array">Array</option>
              <option value="url">URL</option>
              <option value="id">Image ID</option>
            </select>
          </Field>
          <Field label="Preview Size">
            <select style={S.select} value={field.previewSize ?? "medium"} onChange={(e) => u("previewSize", e.target.value)}>
              <option value="thumbnail">Thumbnail</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="full">Full</option>
            </select>
          </Field>
          <Field label="Library">
            <select style={S.select} value={field.library ?? "all"} onChange={(e) => u("library", e.target.value)}>
              <option value="all">All</option>
              <option value="uploadedTo">Uploaded to post</option>
            </select>
          </Field>
        </div>
        <p style={S.sectionTitle}>Restrictions</p>
        <div style={S.row3}>
          <Field label="Min Width (px)"><input style={S.input} type="number" value={field.minWidth ?? ""} onChange={(e) => u("minWidth", e.target.value)} /></Field>
          <Field label="Min Height (px)"><input style={S.input} type="number" value={field.minHeight ?? ""} onChange={(e) => u("minHeight", e.target.value)} /></Field>
          <Field label="Min File Size"><input style={S.input} value={field.minSize ?? ""} onChange={(e) => u("minSize", e.target.value)} placeholder="e.g. 400 or 400kb" /></Field>
          <Field label="Max Width (px)"><input style={S.input} type="number" value={field.maxWidth ?? ""} onChange={(e) => u("maxWidth", e.target.value)} /></Field>
          <Field label="Max Height (px)"><input style={S.input} type="number" value={field.maxHeight ?? ""} onChange={(e) => u("maxHeight", e.target.value)} /></Field>
          <Field label="Max File Size"><input style={S.input} value={field.maxSize ?? ""} onChange={(e) => u("maxSize", e.target.value)} placeholder="e.g. 800 or 800kb" /></Field>
          <Field label="Allowed File Types" hint="Comma separated, e.g. jpg,png,gif"><input style={S.input} value={field.mimeTypes ?? ""} onChange={(e) => u("mimeTypes", e.target.value)} /></Field>
        </div>
      </div>
    );
  }

  // File
  if (t === "file") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row3}>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "array"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="array">Array</option>
              <option value="url">URL</option>
              <option value="id">File ID</option>
            </select>
          </Field>
          <Field label="Library">
            <select style={S.select} value={field.library ?? "all"} onChange={(e) => u("library", e.target.value)}>
              <option value="all">All</option>
              <option value="uploadedTo">Uploaded to post</option>
            </select>
          </Field>
        </div>
        <div style={S.row3}>
          <Field label="Min File Size"><input style={S.input} value={field.minSize ?? ""} onChange={(e) => u("minSize", e.target.value)} /></Field>
          <Field label="Max File Size"><input style={S.input} value={field.maxSize ?? ""} onChange={(e) => u("maxSize", e.target.value)} /></Field>
          <Field label="Allowed File Types"><input style={S.input} value={field.mimeTypes ?? ""} onChange={(e) => u("mimeTypes", e.target.value)} placeholder="pdf,doc,docx" /></Field>
        </div>
      </div>
    );
  }

  // WYSIWYG
  if (t === "wysiwyg") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Field label="Default Value"><textarea style={{ ...S.input, resize: "vertical" }} rows={4} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
        <div style={S.row3}>
          <Field label="Tabs">
            <select style={S.select} value={field.tabs ?? "all"} onChange={(e) => u("tabs", e.target.value)}>
              <option value="all">Visual & Text</option>
              <option value="visual">Visual Only</option>
              <option value="text">Text Only</option>
            </select>
          </Field>
          <Field label="Toolbar">
            <select style={S.select} value={field.toolbar ?? "full"} onChange={(e) => u("toolbar", e.target.value)}>
              <option value="full">Full</option>
              <option value="basic">Basic</option>
            </select>
          </Field>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
            <Toggle checked={field.mediaUpload !== false} onChange={(v) => u("mediaUpload", v)} label="Media Upload" />
          </div>
        </div>
      </div>
    );
  }

  // oEmbed
  if (t === "oembed") {
    return (
      <div style={S.row2}>
        <Field label="Width"><input style={S.input} value={field.width ?? ""} onChange={(e) => u("width", e.target.value)} /></Field>
        <Field label="Height"><input style={S.input} value={field.height ?? ""} onChange={(e) => u("height", e.target.value)} /></Field>
      </div>
    );
  }

  // Gallery
  if (t === "gallery") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row3}>
          <Field label="Min"><input style={S.input} type="number" value={field.min ?? ""} onChange={(e) => u("min", e.target.value)} /></Field>
          <Field label="Max"><input style={S.input} type="number" value={field.max ?? ""} onChange={(e) => u("max", e.target.value)} /></Field>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "array"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="array">Array</option>
              <option value="id">ID</option>
            </select>
          </Field>
          <Field label="Library">
            <select style={S.select} value={field.library ?? "all"} onChange={(e) => u("library", e.target.value)}>
              <option value="all">All</option>
              <option value="uploadedTo">Uploaded to post</option>
            </select>
          </Field>
          <Field label="Min Width (px)"><input style={S.input} type="number" value={field.minWidth ?? ""} onChange={(e) => u("minWidth", e.target.value)} /></Field>
          <Field label="Min Height (px)"><input style={S.input} type="number" value={field.minHeight ?? ""} onChange={(e) => u("minHeight", e.target.value)} /></Field>
          <Field label="Max Width (px)"><input style={S.input} type="number" value={field.maxWidth ?? ""} onChange={(e) => u("maxWidth", e.target.value)} /></Field>
          <Field label="Max Height (px)"><input style={S.input} type="number" value={field.maxHeight ?? ""} onChange={(e) => u("maxHeight", e.target.value)} /></Field>
          <Field label="Allowed File Types"><input style={S.input} value={field.mimeTypes ?? ""} onChange={(e) => u("mimeTypes", e.target.value)} /></Field>
        </div>
      </div>
    );
  }

  // Select
  if (t === "select") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <ChoicesEditor value={field.choices ?? ""} onChange={(v) => u("choices", v)} />
        <div style={S.row3}>
          <Field label="Default Value"><input style={S.input} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "value"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="value">Value</option>
              <option value="label">Label</option>
              <option value="array">Both (Array)</option>
            </select>
          </Field>
          <Field label="Placeholder"><input style={S.input} value={field.placeholder ?? ""} onChange={(e) => u("placeholder", e.target.value)} /></Field>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Toggle checked={!!field.allowNull} onChange={(v) => u("allowNull", v)} label="Allow Null" />
          <Toggle checked={!!field.multiple} onChange={(v) => u("multiple", v)} label="Select Multiple Values" />
          <Toggle checked={field.ui !== false} onChange={(v) => u("ui", v)} label="Stylised UI" />
          <Toggle checked={!!field.ajax} onChange={(v) => u("ajax", v)} label="Load choices via AJAX" />
        </div>
      </div>
    );
  }

  // Checkbox
  if (t === "checkbox") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <ChoicesEditor value={field.choices ?? ""} onChange={(v) => u("choices", v)} />
        <div style={S.row3}>
          <Field label="Default Value"><input style={S.input} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
          <Field label="Layout">
            <select style={S.select} value={field.layout ?? "vertical"} onChange={(e) => u("layout", e.target.value)}>
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </Field>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "value"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="value">Value</option>
              <option value="label">Label</option>
              <option value="array">Both (Array)</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Toggle checked={!!field.toggle} onChange={(v) => u("toggle", v)} label="Toggle All" />
          <Toggle checked={!!field.saveCustom} onChange={(v) => u("saveCustom", v)} label="Save Custom Values" />
          <Toggle checked={!!field.loadCustom} onChange={(v) => u("loadCustom", v)} label="Load Custom Values" />
        </div>
      </div>
    );
  }

  // Radio
  if (t === "radio") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <ChoicesEditor value={field.choices ?? ""} onChange={(v) => u("choices", v)} />
        <div style={S.row3}>
          <Field label="Default Value"><input style={S.input} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
          <Field label="Layout">
            <select style={S.select} value={field.layout ?? "vertical"} onChange={(e) => u("layout", e.target.value)}>
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </Field>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "value"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="value">Value</option>
              <option value="label">Label</option>
              <option value="array">Both (Array)</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Toggle checked={!!field.otherChoice} onChange={(v) => u("otherChoice", v)} label="Other Choice" />
          <Toggle checked={!!field.saveOther} onChange={(v) => u("saveOther", v)} label="Save Other" />
        </div>
      </div>
    );
  }

  // Button Group
  if (t === "button_group") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <ChoicesEditor value={field.choices ?? ""} onChange={(v) => u("choices", v)} />
        <div style={S.row3}>
          <Field label="Default Value"><input style={S.input} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} /></Field>
          <Field label="Layout">
            <select style={S.select} value={field.layout ?? "horizontal"} onChange={(e) => u("layout", e.target.value)}>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </Field>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "value"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="value">Value</option>
              <option value="label">Label</option>
              <option value="array">Both (Array)</option>
            </select>
          </Field>
        </div>
      </div>
    );
  }

  // True/False
  if (t === "true_false") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Field label="Message" hint="Displayed alongside the checkbox">
          <input style={S.input} value={field.message ?? ""} onChange={(e) => u("message", e.target.value)} />
        </Field>
        <div style={S.row2}>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
            <Toggle checked={!!field.defaultValue} onChange={(v) => u("defaultValue", v)} label="Checked by default" />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
            <Toggle checked={field.ui !== false} onChange={(v) => u("ui", v)} label="Stylised UI (toggle)" />
          </div>
        </div>
        {field.ui !== false && (
          <div style={S.row2}>
            <Field label="On Text"><input style={S.input} value={field.uiOnText ?? "Yes"} onChange={(e) => u("uiOnText", e.target.value)} /></Field>
            <Field label="Off Text"><input style={S.input} value={field.uiOffText ?? "No"} onChange={(e) => u("uiOffText", e.target.value)} /></Field>
          </div>
        )}
      </div>
    );
  }

  // Link
  if (t === "link") {
    return (
      <Field label="Return Format">
        <select style={S.select} value={field.returnFormat ?? "array"} onChange={(e) => u("returnFormat", e.target.value)}>
          <option value="array">Array (url, title, target)</option>
          <option value="url">URL only</option>
        </select>
      </Field>
    );
  }

  // Post Object / Page Link
  if (t === "post_object" || t === "page_link") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Field label="Filter by Post Type">
          <MultiCheckSelect
            value={field.postType ?? []}
            options={[
              { value: "post", label: "Post" },
              { value: "page", label: "Page" },
            ]}
            onChange={(v) => u("postType", v)}
          />
        </Field>
        <div style={S.row3}>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "object"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="object">Post Object</option>
              <option value="id">Post ID</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Toggle checked={!!field.allowNull} onChange={(v) => u("allowNull", v)} label="Allow Null" />
          <Toggle checked={!!field.multiple} onChange={(v) => u("multiple", v)} label="Select Multiple" />
          {t === "post_object" && <Toggle checked={field.ui !== false} onChange={(v) => u("ui", v)} label="Stylised UI" />}
          {t === "page_link" && <Toggle checked={!!field.allowArchives} onChange={(v) => u("allowArchives", v)} label="Allow Archives URLs" />}
        </div>
      </div>
    );
  }

  // Relationship
  if (t === "relationship") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Field label="Filter by Post Type">
          <MultiCheckSelect
            value={field.postType ?? []}
            options={[{ value: "post", label: "Post" }, { value: "page", label: "Page" }]}
            onChange={(v) => u("postType", v)}
          />
        </Field>
        <Field label="Filters" hint="What filters appear in the selection interface">
          <MultiCheckSelect
            value={field.filters ?? ["search", "post_type", "taxonomy"]}
            options={[{ value: "search", label: "Search" }, { value: "post_type", label: "Post Type" }, { value: "taxonomy", label: "Taxonomy" }]}
            onChange={(v) => u("filters", v)}
          />
        </Field>
        <div style={S.row3}>
          <Field label="Min items"><input style={S.input} type="number" value={field.min ?? ""} onChange={(e) => u("min", e.target.value)} /></Field>
          <Field label="Max items"><input style={S.input} type="number" value={field.max ?? ""} onChange={(e) => u("max", e.target.value)} /></Field>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "object"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="object">Post Object</option>
              <option value="id">Post ID</option>
            </select>
          </Field>
        </div>
      </div>
    );
  }

  // Taxonomy
  if (t === "taxonomy") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row3}>
          <Field label="Taxonomy">
            <select style={S.select} value={field.taxonomy ?? "category"} onChange={(e) => u("taxonomy", e.target.value)}>
              <option value="category">Category</option>
              <option value="post_tag">Tag</option>
            </select>
          </Field>
          <Field label="Appearance">
            <select style={S.select} value={field.fieldType ?? "checkbox"} onChange={(e) => u("fieldType", e.target.value)}>
              <option value="checkbox">Checkbox</option>
              <option value="multi_select">Multi Select</option>
              <option value="radio">Radio Buttons</option>
              <option value="select">Select</option>
            </select>
          </Field>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "id"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="object">Term Object</option>
              <option value="id">Term ID</option>
              <option value="slug">Slug</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Toggle checked={!!field.addTerm} onChange={(v) => u("addTerm", v)} label="Create Terms" />
          <Toggle checked={!!field.saveTerms} onChange={(v) => u("saveTerms", v)} label="Save Terms" />
          <Toggle checked={!!field.loadTerms} onChange={(v) => u("loadTerms", v)} label="Load Terms" />
        </div>
      </div>
    );
  }

  // User
  if (t === "user") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Field label="Filter by Role">
          <MultiCheckSelect
            value={field.role ?? []}
            options={[
              { value: "administrator", label: "Administrator" },
              { value: "editor", label: "Editor" },
              { value: "author", label: "Author" },
              { value: "contributor", label: "Contributor" },
              { value: "subscriber", label: "Subscriber" },
            ]}
            onChange={(v) => u("role", v)}
          />
        </Field>
        <div style={S.row2}>
          <Field label="Return Format">
            <select style={S.select} value={field.returnFormat ?? "array"} onChange={(e) => u("returnFormat", e.target.value)}>
              <option value="array">Array</option>
              <option value="object">User Object</option>
              <option value="id">User ID</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Toggle checked={!!field.allowNull} onChange={(v) => u("allowNull", v)} label="Allow Null" />
          <Toggle checked={!!field.multiple} onChange={(v) => u("multiple", v)} label="Select Multiple" />
        </div>
      </div>
    );
  }

  // Date pickers
  if (t === "date_picker" || t === "date_time_picker") {
    return (
      <div style={S.row3}>
        <Field label="Display Format" hint="Shown in the admin UI">
          <input style={S.input} value={field.displayFormat ?? (t === "date_picker" ? "d/m/Y" : "d/m/Y g:i a")} onChange={(e) => u("displayFormat", e.target.value)} />
        </Field>
        <Field label="Return Format" hint="Saved to database">
          <input style={S.input} value={field.returnFormat ?? (t === "date_picker" ? "Ymd" : "Y-m-d H:i:s")} onChange={(e) => u("returnFormat", e.target.value)} />
        </Field>
        <Field label="Week Starts On">
          <select style={S.select} value={String(field.firstDay ?? 0)} onChange={(e) => u("firstDay", Number(e.target.value))}>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </Field>
      </div>
    );
  }

  // Time Picker
  if (t === "time_picker") {
    return (
      <div style={S.row2}>
        <Field label="Display Format"><input style={S.input} value={field.displayFormat ?? "g:i a"} onChange={(e) => u("displayFormat", e.target.value)} /></Field>
        <Field label="Return Format"><input style={S.input} value={field.returnFormat ?? "H:i:s"} onChange={(e) => u("returnFormat", e.target.value)} /></Field>
      </div>
    );
  }

  // Color Picker
  if (t === "color_picker") {
    return (
      <div style={S.row3}>
        <Field label="Default Value"><input style={S.input} value={field.defaultValue ?? ""} onChange={(e) => u("defaultValue", e.target.value)} placeholder="#ffffff" /></Field>
        <Field label="Return Format">
          <select style={S.select} value={field.returnFormat ?? "string"} onChange={(e) => u("returnFormat", e.target.value)}>
            <option value="string">String</option>
            <option value="array">Array (r,g,b,a)</option>
          </select>
        </Field>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
          <Toggle checked={!!field.enableOpacity} onChange={(v) => u("enableOpacity", v)} label="Enable Opacity" />
        </div>
      </div>
    );
  }

  // Google Map
  if (t === "google_map") {
    return (
      <div style={S.row3}>
        <Field label="Center Lat"><input style={S.input} value={field.centerLat ?? ""} onChange={(e) => u("centerLat", e.target.value)} /></Field>
        <Field label="Center Lng"><input style={S.input} value={field.centerLng ?? ""} onChange={(e) => u("centerLng", e.target.value)} /></Field>
        <Field label="Zoom"><input style={S.input} type="number" value={field.zoom ?? 14} onChange={(e) => u("zoom", e.target.value)} /></Field>
        <Field label="Height (px)"><input style={S.input} type="number" value={field.height ?? 400} onChange={(e) => u("height", e.target.value)} /></Field>
      </div>
    );
  }

  // Message
  if (t === "message") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Field label="Message">
          <textarea style={{ ...S.input, resize: "vertical" }} rows={3} value={field.message ?? ""} onChange={(e) => u("message", e.target.value)} />
        </Field>
        <div style={S.row2}>
          <Field label="New Lines">
            <select style={S.select} value={field.newLines ?? "wpautop"} onChange={(e) => u("newLines", e.target.value)}>
              <option value="wpautop">Automatically add paragraphs</option>
              <option value="br">Automatically add &lt;br&gt;</option>
              <option value="">No Formatting</option>
            </select>
          </Field>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
            <Toggle checked={field.escHtml !== false} onChange={(v) => u("escHtml", v)} label="Escape HTML" />
          </div>
        </div>
      </div>
    );
  }

  // Accordion
  if (t === "accordion") {
    return (
      <div style={{ display: "flex", gap: "24px" }}>
        <Toggle checked={!!field.open} onChange={(v) => u("open", v)} label="Open on load" />
        <Toggle checked={!!field.multiExpand} onChange={(v) => u("multiExpand", v)} label="Multi-expand" />
        <Toggle checked={!!field.endpoint} onChange={(v) => u("endpoint", v)} label="End Point" hint="Close this accordion" />
      </div>
    );
  }

  // Tab
  if (t === "tab") {
    return (
      <div style={{ display: "flex", gap: "24px" }}>
        <Field label="Placement">
          <select style={{ ...S.select, width: "auto" }} value={field.placement ?? "top"} onChange={(e) => u("placement", e.target.value)}>
            <option value="top">Top Aligned</option>
            <option value="left">Left Aligned</option>
          </select>
        </Field>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
          <Toggle checked={!!field.endpoint} onChange={(v) => u("endpoint", v)} label="End Point" />
        </div>
      </div>
    );
  }

  // Group
  if (t === "group") {
    return (
      <Field label="Layout">
        <select style={{ ...S.select, width: "auto" }} value={field.layout ?? "block"} onChange={(e) => u("layout", e.target.value)}>
          <option value="block">Block</option>
          <option value="table">Table</option>
          <option value="row">Row</option>
        </select>
      </Field>
    );
  }

  // Repeater
  if (t === "repeater") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row3}>
          <Field label="Min Rows"><input style={S.input} type="number" value={field.min ?? ""} onChange={(e) => u("min", e.target.value)} /></Field>
          <Field label="Max Rows"><input style={S.input} type="number" value={field.max ?? ""} onChange={(e) => u("max", e.target.value)} /></Field>
          <Field label="Layout">
            <select style={S.select} value={field.layout ?? "table"} onChange={(e) => u("layout", e.target.value)}>
              <option value="table">Table</option>
              <option value="block">Block</option>
              <option value="row">Row</option>
            </select>
          </Field>
          <Field label="Button Label"><input style={S.input} value={field.buttonLabel ?? "Add Row"} onChange={(e) => u("buttonLabel", e.target.value)} /></Field>
        </div>
      </div>
    );
  }

  // Flexible Content
  if (t === "flexible_content") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={S.row3}>
          <Field label="Min Layouts"><input style={S.input} type="number" value={field.min ?? ""} onChange={(e) => u("min", e.target.value)} /></Field>
          <Field label="Max Layouts"><input style={S.input} type="number" value={field.max ?? ""} onChange={(e) => u("max", e.target.value)} /></Field>
          <Field label="Button Label"><input style={S.input} value={field.buttonLabel ?? "Add Layout"} onChange={(e) => u("buttonLabel", e.target.value)} /></Field>
        </div>
      </div>
    );
  }

  // Clone
  if (t === "clone") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <Field label="Clone field keys / group keys (one per line)" hint="Enter field_key or group_key values">
          <textarea style={{ ...S.input, fontFamily: "monospace", resize: "vertical" }} rows={4}
            value={(field.clone ?? []).join("\n")}
            onChange={(e) => u("clone", e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean))}
          />
        </Field>
        <div style={S.row2}>
          <Field label="Display">
            <select style={S.select} value={field.display ?? "seamless"} onChange={(e) => u("display", e.target.value)}>
              <option value="seamless">Seamless</option>
              <option value="group">Group</option>
            </select>
          </Field>
          <Field label="Layout">
            <select style={S.select} value={field.layout ?? "block"} onChange={(e) => u("layout", e.target.value)}>
              <option value="block">Block</option>
              <option value="table">Table</option>
              <option value="row">Row</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Toggle checked={!!field.prefixLabel} onChange={(v) => u("prefixLabel", v)} label="Prefix Field Labels" />
          <Toggle checked={!!field.prefixName} onChange={(v) => u("prefixName", v)} label="Prefix Field Names" />
        </div>
      </div>
    );
  }

  return null;
}

// ─── Conditional Logic Editor ─────────────────────────────────────────────────

function ConditionalLogicEditor({ field, allFields, update }: {
  field: ACFField;
  allFields: ACFField[];
  update: (patch: Partial<ACFField>) => void;
}) {
  const enabled = field.conditionalLogic !== false;
  const rules: any[][] = (enabled && Array.isArray(field.conditionalLogic)) ? field.conditionalLogic : [];

  const OPERATORS = [
    { value: "==", label: "== is equal to" },
    { value: "!=", label: "!= is not equal to" },
    { value: ">",  label: "> is greater than" },
    { value: "<",  label: "< is less than" },
    { value: ">=", label: ">= is greater than or equal to" },
    { value: "<=", label: "<= is less than or equal to" },
    { value: "=empty",  label: "== is empty" },
    { value: "!=empty", label: "!= is not empty" },
  ];

  const setRules = (newRules: any[][]) => update({ conditionalLogic: newRules.length ? newRules : false });

  return (
    <div style={{ marginTop: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <Toggle checked={enabled} onChange={(v) => update({ conditionalLogic: v ? [[{ field: "", operator: "==", value: "" }]] : false })} />
        <span style={{ fontSize: "13px", color: "#1d2327", fontWeight: 600 }}>Conditional Logic</span>
        {enabled && <span style={{ fontSize: "11px", color: "#646970" }}>Show this field if</span>}
      </div>
      {enabled && (
        <div>
          {rules.map((andGroup, gi) => (
            <div key={gi} style={{ background: "#f6f7f7", border: "1px solid #dcdcde", borderRadius: "3px", padding: "12px", marginBottom: "8px" }}>
              {gi > 0 && <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#646970", marginBottom: "8px" }}>OR</div>}
              {andGroup.map((rule, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
                  {ri > 0 && <div style={{ gridColumn: "1/-1", fontSize: "11px", fontWeight: 700, color: "#646970" }}>AND</div>}
                  <select style={S.select} value={rule.field} onChange={(e) => {
                    const ng = rules.map((g, gi2) => gi2 === gi ? g.map((r, ri2) => ri2 === ri ? { ...r, field: e.target.value } : r) : g);
                    setRules(ng);
                  }}>
                    <option value="">Select field...</option>
                    {allFields.filter(f => f.id !== field.id).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                  <select style={S.select} value={rule.operator} onChange={(e) => {
                    const ng = rules.map((g, gi2) => gi2 === gi ? g.map((r, ri2) => ri2 === ri ? { ...r, operator: e.target.value } : r) : g);
                    setRules(ng);
                  }}>
                    {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  <input style={S.input} value={rule.value} onChange={(e) => {
                    const ng = rules.map((g, gi2) => gi2 === gi ? g.map((r, ri2) => ri2 === ri ? { ...r, value: e.target.value } : r) : g);
                    setRules(ng);
                  }} />
                  <button onClick={() => {
                    const ng = rules.map((g, gi2) => gi2 === gi ? g.filter((_, ri2) => ri2 !== ri) : g).filter(g => g.length > 0);
                    setRules(ng);
                  }} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <button onClick={() => {
                  const ng = rules.map((g, gi2) => gi2 === gi ? [...g, { field: "", operator: "==", value: "" }] : g);
                  setRules(ng);
                }} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px solid #2271b1", borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>
                  + AND
                </button>
                <button onClick={() => setRules(rules.filter((_, gi2) => gi2 !== gi))} style={{ fontSize: "12px", color: "#d63638", background: "none", border: "1px solid #d63638", borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>
                  Remove Group
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setRules([...rules, [{ field: "", operator: "==", value: "" }]])} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px solid #2271b1", borderRadius: "3px", padding: "5px 12px", cursor: "pointer" }}>
            + OR
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Flex Layout Editor ───────────────────────────────────────────────────────

function FlexLayoutEditor({ field, update, allFields }: { field: ACFField; update: (patch: Partial<ACFField>) => void; allFields: ACFField[] }) {
  const layouts = field.layouts ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setLayouts = (l: FlexLayout[]) => update({ layouts: l });

  const addLayout = () => {
    const l: FlexLayout = { id: uid(), key: "layout_" + uid(), label: "New Layout", name: "new_layout_" + uid().slice(0, 4), display: "block", min: "", max: "", subFields: [] };
    setLayouts([...layouts, l]);
    setExpandedId(l.id);
  };

  const updateLayout = (id: string, patch: Partial<FlexLayout>) =>
    setLayouts(layouts.map(l => l.id === id ? { ...l, ...patch } : l));

  return (
    <div style={{ marginTop: "10px" }}>
      <p style={S.sectionTitle}>Layouts</p>
      {layouts.map((layout, idx) => (
        <div key={layout.id} style={{ border: "1px solid #dcdcde", borderRadius: "3px", marginBottom: "6px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f6f7f7", cursor: "pointer" }}
            onClick={() => setExpandedId(expandedId === layout.id ? null : layout.id)}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#646970", minWidth: "20px" }}>{expandedId === layout.id ? "▼" : "▶"}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d2327", flex: 1 }}>{layout.label || "Untitled Layout"}</span>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#646970" }}>{layout.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setLayouts(layouts.filter(l => l.id !== layout.id)); }} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "16px" }}>×</button>
          </div>
          {expandedId === layout.id && (
            <div style={{ padding: "16px" }}>
              <div style={{ ...S.row3, marginBottom: "14px" }}>
                <Field label="Label"><input style={S.input} value={layout.label} onChange={(e) => updateLayout(layout.id, { label: e.target.value })} /></Field>
                <Field label="Name"><input style={S.input} value={layout.name} onChange={(e) => updateLayout(layout.id, { name: e.target.value })} /></Field>
                <Field label="Display">
                  <select style={S.select} value={layout.display} onChange={(e) => updateLayout(layout.id, { display: e.target.value as any })}>
                    <option value="block">Block</option>
                    <option value="table">Table</option>
                    <option value="row">Row</option>
                  </select>
                </Field>
                <Field label="Min Rows"><input style={S.input} type="number" value={layout.min} onChange={(e) => updateLayout(layout.id, { min: e.target.value })} /></Field>
                <Field label="Max Rows"><input style={S.input} type="number" value={layout.max} onChange={(e) => updateLayout(layout.id, { max: e.target.value })} /></Field>
              </div>
              <p style={{ ...S.sectionTitle, marginBottom: "8px" }}>Sub Fields</p>
              <NestedFieldList
                fields={layout.subFields}
                onChange={(sf) => updateLayout(layout.id, { subFields: sf })}
                parentFields={allFields}
                depth={2}
              />
            </div>
          )}
        </div>
      ))}
      <button onClick={addLayout} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px dashed #2271b1", borderRadius: "3px", padding: "6px 14px", cursor: "pointer", width: "100%" }}>
        + Add Layout
      </button>
    </div>
  );
}

// ─── Nested Field List ────────────────────────────────────────────────────────

function NestedFieldList({ fields, onChange, parentFields, depth = 1 }: {
  fields: ACFField[];
  onChange: (f: ACFField[]) => void;
  parentFields: ACFField[];
  depth?: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const addField = (type: ACFFieldType) => {
    const f = createField(type);
    onChange([...fields, f]);
    setExpandedId(f.id);
    setShowPicker(false);
  };

  const updateField = (id: string, patch: Partial<ACFField>) =>
    onChange(fields.map(f => f.id === id ? { ...f, ...patch } : f));

  const deleteField = (id: string) => onChange(fields.filter(f => f.id !== id));

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex(f => f.id === id);
    if (idx + dir < 0 || idx + dir >= fields.length) return;
    const arr = [...fields];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    onChange(arr);
  };

  return (
    <div>
      {fields.map((field, idx) => (
        <FieldRow
          key={field.id}
          field={field}
          expanded={expandedId === field.id}
          onToggle={() => setExpandedId(expandedId === field.id ? null : field.id)}
          onUpdate={(patch) => updateField(field.id, patch)}
          onDelete={() => deleteField(field.id)}
          onMove={(dir) => moveField(field.id, dir)}
          isFirst={idx === 0}
          isLast={idx === fields.length - 1}
          allFields={[...parentFields, ...fields]}
          depth={depth}
        />
      ))}
      {showPicker ? (
        <FieldTypePicker onSelect={addField} onClose={() => setShowPicker(false)} />
      ) : (
        <button onClick={() => setShowPicker(true)} style={{
          display: "block", width: "100%", padding: "8px",
          background: "none", border: "1px dashed #2271b1", borderRadius: "3px",
          color: "#2271b1", fontSize: "13px", cursor: "pointer", marginTop: "6px",
        }}>
          + Add {depth > 1 ? "Sub " : ""}Field
        </button>
      )}
    </div>
  );
}

// ─── Field Type Picker ────────────────────────────────────────────────────────

function FieldTypePicker({ onSelect, onClose }: { onSelect: (t: ACFFieldType) => void; onClose: () => void }) {
  const categories = ["Basic", "Content", "Choice", "Relational", "jQuery", "Layout", "Pro"];
  const [activeCategory, setActiveCategory] = useState("Basic");

  const fields = Object.entries(FIELD_TYPES).filter(([, m]) => m.category === activeCategory);

  return (
    <div style={{ border: "1px solid #dcdcde", borderRadius: "4px", background: "#fff", marginTop: "6px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #dcdcde", background: "#f6f7f7" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1d2327" }}>Select Field Type</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#646970" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr" }}>
        <div style={{ borderRight: "1px solid #dcdcde", padding: "8px 0" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 16px", fontSize: "13px", border: "none",
              background: cat === activeCategory ? "#f0f6fc" : "none",
              color: cat === activeCategory ? "#2271b1" : "#1d2327",
              cursor: "pointer", fontWeight: cat === activeCategory ? 600 : 400,
              borderLeft: cat === activeCategory ? "3px solid #2271b1" : "3px solid transparent",
            }}>
              {cat}
              {cat === "Pro" && <span style={{ fontSize: "9px", background: "#2271b1", color: "#fff", borderRadius: "2px", padding: "1px 4px", marginLeft: "6px" }}>PRO</span>}
            </button>
          ))}
        </div>
        <div style={{ padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", alignContent: "start" }}>
          {fields.map(([type, meta]) => (
            <button key={type} onClick={() => onSelect(type as ACFFieldType)} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 12px", border: "1px solid #dcdcde", borderRadius: "3px",
              background: "#fff", cursor: "pointer", fontSize: "12px", color: "#1d2327",
              textAlign: "left",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0f6fc")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <span style={{ fontSize: "16px", width: "20px", textAlign: "center", flexShrink: 0 }}>{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({ field, expanded, onToggle, onUpdate, onDelete, onMove, isFirst, isLast, allFields, depth }: {
  field: ACFField;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<ACFField>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  allFields: ACFField[];
  depth: number;
}) {
  const meta = FIELD_TYPES[field.type] ?? { icon: "?", label: field.type };
  const [showWrapperOptions, setShowWrapperOptions] = useState(false);
  const [showConditional, setShowConditional] = useState(false);

  const hasSubFields = field.type === "repeater" || field.type === "group";
  const hasFlex = field.type === "flexible_content";

  const autoName = (label: string) =>
    label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  return (
    <div style={{ border: "1px solid #dcdcde", borderRadius: "3px", marginBottom: "4px", overflow: "hidden" }}>
      {/* Row header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: expanded ? "#f0f6fc" : "#fff", cursor: "pointer", borderLeft: expanded ? "3px solid #2271b1" : "3px solid transparent" }}
        onClick={onToggle}>
        <span style={{ fontSize: "16px", width: "22px", textAlign: "center", flexShrink: 0 }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d2327" }}>{field.label || "Untitled"}</span>
          <span style={{ fontSize: "11px", color: "#646970", fontFamily: "monospace", marginLeft: "8px" }}>{field.name}</span>
        </div>
        <span style={{ fontSize: "11px", background: "#f0f0f1", color: "#50575e", padding: "2px 8px", borderRadius: "10px", flexShrink: 0 }}>{meta.label}</span>
        {field.required && <span style={{ fontSize: "10px", color: "#d63638", fontWeight: 700 }}>Required</span>}
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onMove(-1)} disabled={isFirst} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "2px", padding: "2px 6px", cursor: "pointer", fontSize: "11px", color: isFirst ? "#c3c4c7" : "#646970" }}>▲</button>
          <button onClick={() => onMove(1)} disabled={isLast} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "2px", padding: "2px 6px", cursor: "pointer", fontSize: "11px", color: isLast ? "#c3c4c7" : "#646970" }}>▼</button>
          <button onClick={onDelete} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "2px", padding: "2px 6px", cursor: "pointer", fontSize: "11px", color: "#d63638" }}>✕</button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: "20px", borderTop: "1px solid #e0e0e0", background: "#fafafa" }}>
          {/* Common options */}
          <div style={{ ...S.row2, marginBottom: "14px" }}>
            <Field label="Field Label">
              <input style={S.input} value={field.label} onChange={(e) => {
                const label = e.target.value;
                onUpdate({ label, name: field.name || autoName(label) });
              }} />
            </Field>
            <Field label="Field Name" hint="Single word, no spaces. Underscores and dashes allowed.">
              <input style={S.input} value={field.name} onChange={(e) => onUpdate({ name: e.target.value })} />
            </Field>
          </div>

          <div style={{ ...S.row2, marginBottom: "14px" }}>
            <Field label="Field Type">
              <select style={S.select} value={field.type} onChange={(e) => {
                const newField = createField(e.target.value as ACFFieldType);
                onUpdate({ ...newField, id: field.id, key: field.key, label: field.label, name: field.name, instructions: field.instructions, required: field.required, conditionalLogic: field.conditionalLogic, wrapper: field.wrapper });
              }}>
                {Object.entries(FIELD_TYPES).map(([k, v]) => (
                  <optgroup key={v.category} label={v.category}>
                    <option key={k} value={k}>{v.label}</option>
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Instructions" hint="Instructions for authors, shown when submitting data">
              <input style={S.input} value={field.instructions} onChange={(e) => onUpdate({ instructions: e.target.value })} />
            </Field>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <Toggle checked={field.required} onChange={(v) => onUpdate({ required: v })} label="Required field" />
          </div>

          {/* Type-specific options */}
          {!["message", "accordion", "tab"].includes(field.type) && (
            <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "3px", padding: "16px", marginBottom: "10px" }}>
              <p style={S.sectionTitle}>Field Settings</p>
              <TypeOptions field={field} update={onUpdate} />
            </div>
          )}

          {/* Sub-fields for repeater / group */}
          {hasSubFields && (
            <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "3px", padding: "16px", marginBottom: "10px" }}>
              <p style={S.sectionTitle}>Sub Fields</p>
              <NestedFieldList
                fields={field.subFields ?? []}
                onChange={(sf) => onUpdate({ subFields: sf })}
                parentFields={allFields}
                depth={depth + 1}
              />
            </div>
          )}

          {/* Flex layouts */}
          {hasFlex && (
            <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "3px", padding: "16px", marginBottom: "10px" }}>
              <FlexLayoutEditor field={field} update={onUpdate} allFields={allFields} />
            </div>
          )}

          {/* Conditional logic */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "3px", padding: "14px", marginBottom: "10px" }}>
            <ConditionalLogicEditor field={field} allFields={allFields} update={onUpdate} />
          </div>

          {/* Wrapper */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "3px", padding: "14px" }}>
            <button onClick={() => setShowWrapperOptions(!showWrapperOptions)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#646970", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
              <span>{showWrapperOptions ? "▼" : "▶"}</span> Wrapper Attributes
            </button>
            {showWrapperOptions && (
              <div style={{ ...S.row3, marginTop: "12px" }}>
                <Field label="Width (%)"><input style={S.input} value={field.wrapper.width} onChange={(e) => onUpdate({ wrapper: { ...field.wrapper, width: e.target.value } })} placeholder="50" /></Field>
                <Field label="CSS Class"><input style={S.input} value={field.wrapper.class} onChange={(e) => onUpdate({ wrapper: { ...field.wrapper, class: e.target.value } })} /></Field>
                <Field label="ID"><input style={S.input} value={field.wrapper.id} onChange={(e) => onUpdate({ wrapper: { ...field.wrapper, id: e.target.value } })} /></Field>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Location Tab ─────────────────────────────────────────────────────────────

function LocationTab({ group, setGroup }: { group: FieldGroup; setGroup: (g: FieldGroup) => void }) {
  const setLocation = (loc: FieldGroupLocation[][]) => setGroup({ ...group, location: loc });

  const addRuleGroup = () => setLocation([...group.location, [{ param: "post_type", operator: "==", value: "post" }]]);

  const addRule = (gi: number) => {
    const loc = group.location.map((g, i) => i === gi ? [...g, { param: "post_type", operator: "==" as const, value: "post" }] : g);
    setLocation(loc);
  };

  const updateRule = (gi: number, ri: number, patch: Partial<FieldGroupLocation>) => {
    const loc = group.location.map((g, i) => i === gi ? g.map((r, j) => j === ri ? { ...r, ...patch } : r) : g);
    setLocation(loc);
  };

  const removeRule = (gi: number, ri: number) => {
    const loc = group.location.map((g, i) => i === gi ? g.filter((_, j) => j !== ri) : g).filter(g => g.length > 0);
    setLocation(loc);
  };

  return (
    <div>
      <p style={{ fontSize: "13px", color: "#646970", marginBottom: "16px" }}>
        Create a set of rules to determine which edit screens will use these advanced custom fields.
        Rules within a group are AND'd. Groups are OR'd.
      </p>
      {group.location.map((andGroup, gi) => (
        <div key={gi} style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", padding: "16px", marginBottom: "12px" }}>
          {gi > 0 && <div style={{ textAlign: "center", marginBottom: "12px", fontSize: "13px", fontWeight: 700, color: "#646970" }}>OR</div>}
          {andGroup.map((rule, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: "180px 120px 1fr 32px", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
              {ri > 0 && <div style={{ gridColumn: "1/-1", fontSize: "11px", fontWeight: 700, color: "#646970", marginBottom: "2px" }}>AND</div>}
              <select style={S.select} value={rule.param} onChange={(e) => updateRule(gi, ri, { param: e.target.value, value: "" })}>
                {LOCATION_PARAMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select style={S.select} value={rule.operator} onChange={(e) => updateRule(gi, ri, { operator: e.target.value as "==" | "!=" })}>
                <option value="==">== is equal to</option>
                <option value="!=">!= is not equal to</option>
              </select>
              {LOCATION_PARAM_VALUES[rule.param] ? (
                <select style={S.select} value={rule.value} onChange={(e) => updateRule(gi, ri, { value: e.target.value })}>
                  <option value="">Select...</option>
                  {LOCATION_PARAM_VALUES[rule.param].map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              ) : (
                <input style={S.input} value={rule.value} onChange={(e) => updateRule(gi, ri, { value: e.target.value })} placeholder="value" />
              )}
              <button onClick={() => removeRule(gi, ri)} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "3px", cursor: "pointer", color: "#d63638", fontSize: "14px", padding: "4px 8px" }}>×</button>
            </div>
          ))}
          <button onClick={() => addRule(gi)} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px solid #2271b1", borderRadius: "3px", padding: "5px 12px", cursor: "pointer" }}>
            + and
          </button>
        </div>
      ))}
      <button onClick={addRuleGroup} style={{ fontSize: "13px", color: "#2271b1", background: "none", border: "1px dashed #2271b1", borderRadius: "3px", padding: "8px 20px", cursor: "pointer" }}>
        + Add rule group (OR)
      </button>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const HIDE_ON_SCREEN_OPTIONS = [
  { value: "permalink", label: "Permalink" },
  { value: "the_content", label: "Content Editor" },
  { value: "excerpt", label: "Excerpt" },
  { value: "discussion", label: "Discussion" },
  { value: "comments", label: "Comments" },
  { value: "revisions", label: "Revisions" },
  { value: "slug", label: "Slug" },
  { value: "author", label: "Author" },
  { value: "format", label: "Format" },
  { value: "page_attributes", label: "Page Attributes" },
  { value: "featured_image", label: "Featured Image" },
  { value: "categories", label: "Categories" },
  { value: "tags", label: "Tags" },
  { value: "send-trackbacks", label: "Send Trackbacks" },
];

function SettingsTab({ group, setGroup }: { group: FieldGroup; setGroup: (g: FieldGroup) => void }) {
  const u = (k: keyof FieldGroup, v: any) => setGroup({ ...group, [k]: v });

  return (
    <div style={{ display: "grid", gap: "20px", maxWidth: "600px" }}>
      <div style={S.row2}>
        <Field label="Position">
          <select style={S.select} value={group.position} onChange={(e) => u("position", e.target.value)}>
            <option value="normal">Normal (after content)</option>
            <option value="side">Side</option>
            <option value="acf_after_title">High (after title)</option>
          </select>
        </Field>
        <Field label="Order" hint="Determines position in the meta box list">
          <input style={S.input} type="number" value={group.menuOrder} onChange={(e) => u("menuOrder", Number(e.target.value))} />
        </Field>
      </div>

      <div style={S.row2}>
        <Field label="Label Placement">
          <select style={S.select} value={group.labelPlacement} onChange={(e) => u("labelPlacement", e.target.value)}>
            <option value="top">Top aligned</option>
            <option value="left">Left aligned</option>
          </select>
        </Field>
        <Field label="Instruction Placement">
          <select style={S.select} value={group.instructionPlacement} onChange={(e) => u("instructionPlacement", e.target.value)}>
            <option value="label">Below labels</option>
            <option value="field">Below fields</option>
          </select>
        </Field>
      </div>

      <div>
        <label style={S.label}>Hide on Screen</label>
        <p style={S.hint}>Choose which default meta boxes will be hidden on the screen when this field group is visible.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "10px" }}>
          {HIDE_ON_SCREEN_OPTIONS.map(opt => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={group.hideOnScreen.includes(opt.value)}
                onChange={(e) => {
                  const cur = group.hideOnScreen;
                  u("hideOnScreen", e.target.checked ? [...cur, opt.value] : cur.filter(v => v !== opt.value));
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Toggle checked={group.active} onChange={(v) => u("active", v)} label="Active (this field group is enabled)" />
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
  groupId?: string;
}

export default function FieldGroupEditor({ groupId }: Props) {
  const [group, setGroup] = useState<FieldGroup | null>(null);
  const [activeTab, setActiveTab] = useState<"fields" | "location" | "settings">("fields");
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (groupId) {
      fetch(`/api/custom-fields/${groupId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setGroup(data ?? createGroup()))
        .catch(() => setGroup(createGroup()));
    } else {
      setGroup(createGroup());
    }
  }, [groupId]);

  const save = async () => {
    if (!group) return;
    setSaving(true);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
      if (res.ok) {
        setStatus("Saved ✓");
        if (!groupId) {
          const data = await res.json();
          window.location.href = `/admin/custom-fields/${data.group?.id ?? group.id}`;
        }
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("Error saving");
      }
    } catch {
      setStatus("Error saving");
    }
    setSaving(false);
  };

  const deleteGroup = async () => {
    if (!group || !groupId) return;
    if (!confirm("Delete this field group? This cannot be undone.")) return;
    await fetch(`/api/custom-fields/${groupId}`, { method: "DELETE" });
    window.location.href = "/admin/custom-fields";
  };

  const addField = (type: ACFFieldType) => {
    if (!group) return;
    const f = createField(type);
    setGroup({ ...group, fields: [...group.fields, f] });
    setExpandedId(f.id);
    setShowPicker(false);
  };

  const updateField = (id: string, patch: Partial<ACFField>) => {
    if (!group) return;
    setGroup({ ...group, fields: group.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  };

  const deleteField = (id: string) => {
    if (!group) return;
    setGroup({ ...group, fields: group.fields.filter(f => f.id !== id) });
  };

  const moveField = (id: string, dir: -1 | 1) => {
    if (!group) return;
    const idx = group.fields.findIndex(f => f.id === id);
    if (idx + dir < 0 || idx + dir >= group.fields.length) return;
    const arr = [...group.fields];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    setGroup({ ...group, fields: arr });
  };

  if (!group) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#646970" }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
        <input
          value={group.title}
          onChange={(e) => setGroup({ ...group, title: e.target.value })}
          style={{ flex: 1, fontSize: "22px", fontWeight: 700, border: "none", borderBottom: "2px solid #dcdcde", padding: "4px 0", outline: "none", background: "transparent", color: "#1d2327" }}
          placeholder="Field Group Title"
        />
        <span style={{ fontSize: "13px", color: "#646970" }}>{status}</span>
        {groupId && (
          <button onClick={deleteGroup} style={{ fontSize: "12px", color: "#d63638", background: "#fff", border: "1px solid #d63638", padding: "7px 14px", borderRadius: "3px", cursor: "pointer" }}>
            Delete
          </button>
        )}
        <button onClick={save} disabled={saving} style={{ background: "#2271b1", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "3px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
          {saving ? "Saving…" : "Save Field Group"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #dcdcde", marginBottom: "20px" }}>
        {(["fields", "location", "settings"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 20px", fontSize: "13px", border: "none", background: "none",
            borderBottom: tab === activeTab ? "2px solid #2271b1" : "2px solid transparent",
            color: tab === activeTab ? "#2271b1" : "#646970",
            fontWeight: tab === activeTab ? 600 : 400,
            cursor: "pointer", textTransform: "capitalize",
          }}>
            {tab} {tab === "fields" && `(${group.fields.length})`}
          </button>
        ))}
      </div>

      {/* Fields tab */}
      {activeTab === "fields" && (
        <div>
          {group.fields.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#646970", border: "1px dashed #dcdcde", borderRadius: "4px", marginBottom: "12px" }}>
              No fields yet. Click "+ Add Field" to get started.
            </div>
          )}
          {group.fields.map((field, idx) => (
            <FieldRow
              key={field.id}
              field={field}
              expanded={expandedId === field.id}
              onToggle={() => setExpandedId(expandedId === field.id ? null : field.id)}
              onUpdate={(patch) => updateField(field.id, patch)}
              onDelete={() => deleteField(field.id)}
              onMove={(dir) => moveField(field.id, dir)}
              isFirst={idx === 0}
              isLast={idx === group.fields.length - 1}
              allFields={group.fields}
              depth={1}
            />
          ))}
          {showPicker ? (
            <FieldTypePicker onSelect={addField} onClose={() => setShowPicker(false)} />
          ) : (
            <button onClick={() => setShowPicker(true)} style={{
              display: "block", width: "100%", padding: "10px",
              background: "#2271b1", color: "#fff", border: "none",
              borderRadius: "3px", fontSize: "13px", fontWeight: 600,
              cursor: "pointer", marginTop: "8px",
            }}>
              + Add Field
            </button>
          )}
        </div>
      )}

      {/* Location tab */}
      {activeTab === "location" && <LocationTab group={group} setGroup={setGroup} />}

      {/* Settings tab */}
      {activeTab === "settings" && <SettingsTab group={group} setGroup={setGroup} />}
    </div>
  );
}
