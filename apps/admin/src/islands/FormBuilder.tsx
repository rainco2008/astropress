import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Choice { id: string; label: string; value: string; selected: boolean; image?: string; price?: string; }
interface ConditionalRule { fieldId: string; operator: string; value: string; }
interface FormField {
  id: string; type: string; label: string; description: string; required: boolean;
  placeholder: string; defaultValue: string; cssClass: string; hideLabel: boolean;
  conditionalLogic: ConditionalRule[][] | false;
  choices?: Choice[];
  subLabel?: string; subLabels?: Record<string, string>;
  // type-specific
  [key: string]: any;
}
interface Notification {
  id: string; name: string; active: boolean;
  toAddress: string; fromName: string; fromEmail: string; replyTo: string;
  subject: string; message: string; conditionalLogic: ConditionalRule[][] | false;
}
interface Confirmation {
  id: string; name: string; active: boolean;
  type: "message" | "redirect" | "page";
  message: string; redirectUrl: string; page: string;
  autoScroll: boolean; conditionalLogic: ConditionalRule[][] | false;
}
interface FormSettings {
  submitText: string; submitProcessingText: string; submitAlign: string;
  formClass: string; labelAlignment: string; ajax: boolean; honeypot: boolean;
  requireLogin: boolean; requireLoginMessage: string;
  scheduleForm: boolean; scheduleStart: string; scheduleEnd: string; scheduleClosedMessage: string;
  limitEntries: boolean; limitEntriesCount: number; limitEntriesMessage: string;
  storeEntries: boolean;
}
interface WPForm {
  id: string; title: string; fields: FormField[];
  settings: FormSettings; notifications: Notification[]; confirmations: Confirmation[];
  createdAt: string; updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

interface FieldMeta { label: string; icon: string; category: string; noValue?: boolean; }
const FIELDS: Record<string, FieldMeta> = {
  text:              { label: "Single Line Text",  icon: "T",  category: "Standard" },
  textarea:          { label: "Paragraph Text",    icon: "¶",  category: "Standard" },
  dropdown:          { label: "Dropdown",          icon: "▼",  category: "Standard" },
  multiple_choice:   { label: "Multiple Choice",   icon: "⊙",  category: "Standard" },
  checkboxes:        { label: "Checkboxes",        icon: "☑",  category: "Standard" },
  number:            { label: "Number",            icon: "#",  category: "Standard" },
  name:              { label: "Name",              icon: "👤", category: "Standard" },
  email:             { label: "Email",             icon: "@",  category: "Standard" },
  url:               { label: "Website / URL",     icon: "🔗", category: "Standard" },
  phone:             { label: "Phone",             icon: "📞", category: "Standard" },
  address:           { label: "Address",           icon: "📍", category: "Standard" },
  date_time:         { label: "Date / Time",       icon: "📅", category: "Standard" },
  file:              { label: "File Upload",       icon: "📎", category: "Fancy" },
  page_break:        { label: "Page Break",        icon: "📄", category: "Fancy", noValue: true },
  section_divider:   { label: "Section Divider",   icon: "—",  category: "Fancy", noValue: true },
  html:              { label: "HTML / Custom HTML",icon: "</>",category: "Fancy", noValue: true },
  hidden:            { label: "Hidden Field",      icon: "👁", category: "Fancy" },
  rating:            { label: "Rating",            icon: "⭐", category: "Fancy" },
  likert:            { label: "Likert Scale",      icon: "⊞",  category: "Fancy" },
  signature:         { label: "Signature",         icon: "✍",  category: "Fancy" },
  password:          { label: "Password",          icon: "🔒", category: "Fancy" },
  content:           { label: "Content",           icon: "📝", category: "Fancy", noValue: true },
  payment_single:    { label: "Single Item",       icon: "$",  category: "Payment" },
  payment_multiple:  { label: "Multiple Items",    icon: "$$", category: "Payment" },
  payment_checkbox:  { label: "Checkbox Items",    icon: "☑$", category: "Payment" },
  payment_dropdown:  { label: "Dropdown Items",    icon: "▼$", category: "Payment" },
  payment_total:     { label: "Total",             icon: "Σ",  category: "Payment" },
  nps:               { label: "Net Promoter Score",icon: "📊", category: "Survey" },
  range_slider:      { label: "Range Slider",      icon: "↔",  category: "Advanced" },
  captcha:           { label: "CAPTCHA",           icon: "🤖", category: "Advanced" },
};

const CATEGORIES = ["Standard", "Fancy", "Payment", "Survey", "Advanced"];

function makeDefaultChoices(): Choice[] {
  return [
    { id: uid(), label: "First Choice", value: "first", selected: false },
    { id: uid(), label: "Second Choice", value: "second", selected: false },
    { id: uid(), label: "Third Choice", value: "third", selected: false },
  ];
}

function createField(type: string): FormField {
  const hasChoices = ["dropdown","multiple_choice","checkboxes","payment_multiple","payment_checkbox","payment_dropdown"].includes(type);
  return {
    id: uid(), type, label: FIELDS[type]?.label ?? type,
    description: "", required: false, placeholder: "", defaultValue: "",
    cssClass: "", hideLabel: false, conditionalLogic: false,
    ...(hasChoices ? { choices: makeDefaultChoices() } : {}),
    ...(type === "rating" ? { ratingCount: 5, ratingIcon: "star", ratingSize: "medium", ratingColor: "#f5a623" } : {}),
    ...(type === "likert" ? { rows: ["Row 1"], columns: ["Column 1", "Column 2", "Column 3"] } : {}),
    ...(type === "page_break" ? { nextText: "Next", prevText: "Previous", showPrev: true } : {}),
    ...(type === "section_divider" ? { size: "medium" } : {}),
    ...(type === "name" ? { nameFormat: "first-last", subLabels: { first: "First Name", last: "Last Name" } } : {}),
    ...(type === "address" ? { addressScheme: "international" } : {}),
    ...(type === "date_time" ? { dateEnable: true, timeEnable: false, dateType: "datepicker", dateFormat: "MM/DD/YYYY", timeFormat: "12H" } : {}),
    ...(type === "payment_single" ? { itemName: "", itemPrice: "" } : {}),
    ...(type === "range_slider" ? { min: 0, max: 100, step: 1, defaultValue: 50, handles: "single" } : {}),
    ...(type === "nps" ? { npsStart: "Not at all likely", npsEnd: "Extremely likely" } : {}),
    ...(type === "captcha" ? { captchaType: "hcaptcha", siteKey: "", secretKey: "" } : {}),
    ...(type === "signature" ? { penColor: "#000000", penSize: "medium" } : {}),
    ...(type === "file" ? { fileExtensions: "jpg,jpeg,png,gif,pdf,doc,docx", fileMaxSize: "10", fileMaxCount: "1" } : {}),
    ...(type === "number" ? { numberFormat: "decimal", numberMin: "", numberMax: "" } : {}),
    ...(type === "html" ? { htmlContent: "<p>Enter your HTML here</p>" } : {}),
    ...(type === "content" ? { content: "<p>Enter your content here</p>" } : {}),
  };
}

function defaultForm(): WPForm {
  const id = uid();
  return {
    id, title: "New Form",
    fields: [
      createField("name"),
      createField("email"),
      createField("textarea"),
    ],
    settings: {
      submitText: "Submit", submitProcessingText: "Sending…", submitAlign: "left",
      formClass: "", labelAlignment: "top", ajax: true, honeypot: true,
      requireLogin: false, requireLoginMessage: "You must be logged in.",
      scheduleForm: false, scheduleStart: "", scheduleEnd: "", scheduleClosedMessage: "This form is currently closed.",
      limitEntries: false, limitEntriesCount: 100, limitEntriesMessage: "Sorry, this form is no longer accepting entries.",
      storeEntries: true,
    },
    notifications: [{
      id: uid(), name: "Admin Notification", active: true,
      toAddress: "{admin_email}", fromName: "{site_name}",
      fromEmail: "{admin_email}", replyTo: "{field:email}",
      subject: "New Entry: {form_title}", message: "{all_fields}",
      conditionalLogic: false,
    }],
    confirmations: [{
      id: uid(), name: "Default Confirmation", active: true,
      type: "message", message: "<p>Thanks for contacting us! We will be in touch with you shortly.</p>",
      redirectUrl: "", page: "", autoScroll: true, conditionalLogic: false,
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  input: { width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid #8c8f94", borderRadius: "3px", outline: "none", boxSizing: "border-box" as const },
  select: { width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid #8c8f94", borderRadius: "3px", outline: "none" },
  label: { fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#1d2327" } as React.CSSProperties,
  hint: { fontSize: "11px", color: "#646970", marginTop: "3px", margin: "3px 0 0" } as React.CSSProperties,
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } as React.CSSProperties,
  toggle: (on: boolean) => ({ display: "inline-block", width: "36px", height: "20px", background: on ? "#2271b1" : "#c3c4c7", borderRadius: "10px", position: "relative" as const, cursor: "pointer", flexShrink: 0 }),
  toggleDot: (on: boolean) => ({ position: "absolute" as const, top: "2px", left: on ? "18px" : "2px", width: "16px", height: "16px", background: "#fff", borderRadius: "50%", transition: "left .2s" }),
};

function FField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label style={S.label}>{label}</label>{children}{hint && <p style={S.hint}>{hint}</p>}</div>;
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
      <span style={S.toggle(on)} onClick={() => onChange(!on)}><span style={S.toggleDot(on)} /></span>
      {label && <span style={{ fontSize: "13px", color: "#1d2327" }}>{label}</span>}
    </label>
  );
}

// ─── Choices Editor ───────────────────────────────────────────────────────────

function ChoicesEditor({ choices, onChange, showPrice, showImages }: {
  choices: Choice[]; onChange: (c: Choice[]) => void; showPrice?: boolean; showImages?: boolean;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const add = () => onChange([...choices, { id: uid(), label: `Choice ${choices.length + 1}`, value: "", selected: false }]);
  const upd = (id: string, k: keyof Choice, v: any) => onChange(choices.map(c => c.id === id ? { ...c, [k]: v } : c));
  const del = (id: string) => onChange(choices.filter(c => c.id !== id));
  const doImport = () => {
    const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
    onChange([...choices, ...lines.map(l => ({ id: uid(), label: l, value: l.toLowerCase().replace(/\s+/g, "_"), selected: false }))]);
    setImportOpen(false); setImportText("");
  };
  return (
    <div>
      <div style={{ border: "1px solid #dcdcde", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: showPrice ? "auto 1fr 1fr 1fr auto" : "auto 1fr 1fr auto", gap: "0", background: "#f6f7f7", borderBottom: "1px solid #dcdcde", fontSize: "11px", fontWeight: 700, color: "#646970" }}>
          <div style={{ padding: "6px 10px" }}>Default</div>
          <div style={{ padding: "6px 10px" }}>Choice Label</div>
          <div style={{ padding: "6px 10px" }}>Value</div>
          {showPrice && <div style={{ padding: "6px 10px" }}>Price</div>}
          <div style={{ padding: "6px 10px" }}></div>
        </div>
        {choices.map((c, i) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: showPrice ? "auto 1fr 1fr 1fr auto" : "auto 1fr 1fr auto", borderBottom: i < choices.length - 1 ? "1px solid #f0f0f1" : "none", alignItems: "center" }}>
            <div style={{ padding: "6px 10px" }}>
              <input type="checkbox" checked={c.selected} onChange={e => upd(c.id, "selected", e.target.checked)} style={{ width: "14px", height: "14px" }} />
            </div>
            <div style={{ padding: "4px 6px 4px 0" }}>
              <input value={c.label} onChange={e => upd(c.id, "label", e.target.value)} style={{ ...S.input, border: "1px solid transparent", background: "transparent" }} onFocus={e => (e.target.style.border = "1px solid #8c8f94")} onBlur={e => (e.target.style.border = "1px solid transparent")} />
            </div>
            <div style={{ padding: "4px 6px 4px 0" }}>
              <input value={c.value} onChange={e => upd(c.id, "value", e.target.value)} placeholder="auto" style={{ ...S.input, border: "1px solid transparent", background: "transparent", fontFamily: "monospace", fontSize: "12px" }} onFocus={e => (e.target.style.border = "1px solid #8c8f94")} onBlur={e => (e.target.style.border = "1px solid transparent")} />
            </div>
            {showPrice && <div style={{ padding: "4px 6px 4px 0" }}><input value={c.price ?? ""} onChange={e => upd(c.id, "price", e.target.value)} placeholder="0.00" style={{ ...S.input, border: "1px solid transparent", background: "transparent" }} /></div>}
            <div style={{ padding: "6px 10px" }}><button onClick={() => del(c.id)} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button></div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={add} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px solid #2271b1", borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>+ Add Choice</button>
        <button onClick={() => setImportOpen(!importOpen)} style={{ fontSize: "12px", color: "#646970", background: "none", border: "1px solid #dcdcde", borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>Bulk Add Choices</button>
      </div>
      {importOpen && (
        <div style={{ marginTop: "8px", padding: "12px", background: "#f6f7f7", border: "1px solid #dcdcde", borderRadius: "3px" }}>
          <p style={{ fontSize: "12px", color: "#646970", margin: "0 0 6px" }}>Enter one choice per line</p>
          <textarea rows={4} value={importText} onChange={e => setImportText(e.target.value)} style={{ ...S.input, resize: "vertical", marginBottom: "8px" }} />
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={doImport} style={{ fontSize: "12px", background: "#2271b1", color: "#fff", border: "none", borderRadius: "3px", padding: "5px 12px", cursor: "pointer" }}>Add Choices</button>
            <button onClick={() => setImportOpen(false)} style={{ fontSize: "12px", background: "none", border: "1px solid #dcdcde", borderRadius: "3px", padding: "5px 12px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Conditional Logic ────────────────────────────────────────────────────────

const COND_OPS = [
  { value: "is", label: "is" }, { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" }, { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" }, { value: "ends_with", label: "ends with" },
  { value: "empty", label: "is empty" }, { value: "not_empty", label: "is not empty" },
  { value: "greater_than", label: "greater than" }, { value: "less_than", label: "less than" },
];

function ConditionalLogicEditor({ cl, onChange, fields }: {
  cl: ConditionalRule[][] | false;
  onChange: (v: ConditionalRule[][] | false) => void;
  fields: FormField[];
}) {
  const on = cl !== false;
  const rules: ConditionalRule[][] = on && Array.isArray(cl) ? cl : [];
  const eligibleFields = fields.filter(f => !["page_break","section_divider","html","content","captcha"].includes(f.type));

  return (
    <div>
      <Toggle on={on} onChange={v => onChange(v ? [[{ fieldId: "", operator: "is", value: "" }]] : false)} label="Enable Conditional Logic" />
      {on && (
        <div style={{ marginTop: "12px" }}>
          <p style={{ fontSize: "12px", color: "#646970", marginBottom: "10px" }}>Show this field if the following conditions are met:</p>
          {rules.map((andGroup, gi) => (
            <div key={gi} style={{ marginBottom: "8px", padding: "10px", background: "#f6f7f7", border: "1px solid #dcdcde", borderRadius: "3px" }}>
              {gi > 0 && <div style={{ fontSize: "11px", fontWeight: 700, color: "#646970", marginBottom: "6px" }}>OR</div>}
              {andGroup.map((rule, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                  {ri > 0 && <div style={{ gridColumn: "1/-1", fontSize: "11px", fontWeight: 700, color: "#646970" }}>AND</div>}
                  <select style={S.select} value={rule.fieldId} onChange={e => { const ng = rules.map((g, i) => i === gi ? g.map((r, j) => j === ri ? { ...r, fieldId: e.target.value } : r) : g); onChange(ng); }}>
                    <option value="">Select field…</option>
                    {eligibleFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <select style={S.select} value={rule.operator} onChange={e => { const ng = rules.map((g, i) => i === gi ? g.map((r, j) => j === ri ? { ...r, operator: e.target.value } : r) : g); onChange(ng); }}>
                    {COND_OPS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  <input style={S.input} value={rule.value} onChange={e => { const ng = rules.map((g, i) => i === gi ? g.map((r, j) => j === ri ? { ...r, value: e.target.value } : r) : g); onChange(ng); }} placeholder="Value" />
                  <button onClick={() => { const ng = rules.map((g, i) => i === gi ? g.filter((_, j) => j !== ri) : g).filter(g => g.length > 0); onChange(ng.length ? ng : false); }} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "16px" }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => { const ng = rules.map((g, i) => i === gi ? [...g, { fieldId: "", operator: "is", value: "" }] : g); onChange(ng); }} style={{ fontSize: "11px", color: "#2271b1", background: "none", border: "1px solid #2271b1", borderRadius: "3px", padding: "3px 8px", cursor: "pointer" }}>+ AND</button>
                <button onClick={() => onChange(rules.filter((_, i) => i !== gi) as any || false)} style={{ fontSize: "11px", color: "#d63638", background: "none", border: "1px solid #d63638", borderRadius: "3px", padding: "3px 8px", cursor: "pointer" }}>Remove Group</button>
              </div>
            </div>
          ))}
          <button onClick={() => onChange([...rules, [{ fieldId: "", operator: "is", value: "" }]])} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px dashed #2271b1", borderRadius: "3px", padding: "5px 12px", cursor: "pointer" }}>+ Add Condition Group (OR)</button>
        </div>
      )}
    </div>
  );
}

// ─── Smart Tag Picker ─────────────────────────────────────────────────────────

const SMART_TAGS = [
  { tag: "{admin_email}", label: "Admin Email" },
  { tag: "{all_fields}", label: "All Fields" },
  { tag: "{form_title}", label: "Form Title" },
  { tag: "{site_name}", label: "Site Name" },
  { tag: "{site_url}", label: "Site URL" },
  { tag: "{entry_id}", label: "Entry ID" },
  { tag: "{user_ip}", label: "User IP" },
  { tag: "{date format=\"Y-m-d\"}", label: "Current Date" },
];

function SmartTagPicker({ onInsert }: { onInsert: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ fontSize: "11px", color: "#2271b1", background: "none", border: "1px solid #c3d9f7", borderRadius: "3px", padding: "3px 8px", cursor: "pointer" }}>
        Smart Tags
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, background: "#fff", border: "1px solid #dcdcde", borderRadius: "3px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", minWidth: "200px", marginTop: "2px" }}>
          {SMART_TAGS.map(t => (
            <button key={t.tag} onClick={() => { onInsert(t.tag); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", fontSize: "12px", border: "none", background: "none", cursor: "pointer", borderBottom: "1px solid #f0f0f1" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0f6fc")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <span style={{ fontFamily: "monospace", color: "#2271b1" }}>{t.tag}</span>
              <span style={{ color: "#646970", marginLeft: "8px" }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field Settings Panel ─────────────────────────────────────────────────────

function FieldSettings({ field, update, allFields }: { field: FormField; update: (p: Partial<FormField>) => void; allFields: FormField[] }) {
  const [section, setSection] = useState<"general" | "advanced" | "smart_logic">("general");
  const u = (k: string, v: any) => update({ [k]: v });
  const t = field.type;
  const hasChoices = ["dropdown","multiple_choice","checkboxes","payment_multiple","payment_checkbox","payment_dropdown"].includes(t);
  const showPlaceholder = !["multiple_choice","checkboxes","rating","likert","page_break","section_divider","html","content","hidden","signature","payment_total","nps","range_slider","captcha","file"].includes(t);

  return (
    <div style={{ fontSize: "13px" }}>
      {/* Mini tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #dcdcde", marginBottom: "16px" }}>
        {(["general","advanced","smart_logic"] as const).map(s => (
          <button key={s} onClick={() => setSection(s)} style={{ padding: "8px 12px", border: "none", background: "none", borderBottom: s === section ? "2px solid #2271b1" : "2px solid transparent", color: s === section ? "#2271b1" : "#646970", fontWeight: s === section ? 600 : 400, cursor: "pointer", fontSize: "12px", textTransform: "capitalize" }}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {section === "general" && (
        <div style={{ display: "grid", gap: "14px" }}>
          {/* Label */}
          {t !== "html" && t !== "content" && (
            <FField label="Label">
              <input style={S.input} value={field.label} onChange={e => u("label", e.target.value)} />
            </FField>
          )}

          {/* HTML Content */}
          {(t === "html" || t === "content") && (
            <FField label={t === "html" ? "HTML Code" : "Content"}>
              <textarea style={{ ...S.input, resize: "vertical", fontFamily: "monospace" }} rows={6} value={field.htmlContent ?? field.content ?? ""} onChange={e => u(t === "html" ? "htmlContent" : "content", e.target.value)} />
            </FField>
          )}

          {/* Description */}
          {!["page_break","section_divider","html","content"].includes(t) && (
            <FField label="Description / Instructions" hint="Shown below the field label">
              <textarea style={{ ...S.input, resize: "vertical" }} rows={2} value={field.description} onChange={e => u("description", e.target.value)} />
            </FField>
          )}

          {/* Required */}
          {!["page_break","section_divider","html","content","captcha"].includes(t) && (
            <Toggle on={field.required} onChange={v => u("required", v)} label="Required" />
          )}

          {/* Placeholder */}
          {showPlaceholder && (
            <FField label="Placeholder Text">
              <input style={S.input} value={field.placeholder} onChange={e => u("placeholder", e.target.value)} />
            </FField>
          )}

          {/* Choices */}
          {hasChoices && (
            <FField label="Choices">
              <ChoicesEditor
                choices={field.choices ?? []}
                onChange={c => u("choices", c)}
                showPrice={t.startsWith("payment_")}
              />
            </FField>
          )}

          {/* TYPE-SPECIFIC ================================================= */}

          {/* Text */}
          {t === "text" && (
            <>
              <FField label="Default Value"><input style={S.input} value={field.defaultValue} onChange={e => u("defaultValue", e.target.value)} /></FField>
              <div style={S.row2}>
                <FField label="Max Characters" hint="0 = unlimited"><input style={S.input} type="number" value={field.maxChars ?? ""} onChange={e => u("maxChars", e.target.value)} /></FField>
                <FField label="Limit To">
                  <select style={S.select} value={field.limitType ?? "chars"} onChange={e => u("limitType", e.target.value)}>
                    <option value="chars">Characters</option>
                    <option value="words">Words</option>
                  </select>
                </FField>
              </div>
              <Toggle on={!!field.readonly} onChange={v => u("readonly", v)} label="Read Only" />
              <FField label="Input Mask" hint="e.g. (999) 999-9999">
                <input style={S.input} value={field.inputMask ?? ""} onChange={e => u("inputMask", e.target.value)} />
              </FField>
              <FField label="Prepopulate via URL parameter">
                <input style={S.input} value={field.prepopulate ?? ""} onChange={e => u("prepopulate", e.target.value)} placeholder="e.g. first_name" />
              </FField>
            </>
          )}

          {/* Textarea */}
          {t === "textarea" && (
            <>
              <FField label="Default Value"><textarea style={{ ...S.input, resize: "vertical" }} rows={3} value={field.defaultValue} onChange={e => u("defaultValue", e.target.value)} /></FField>
              <div style={S.row2}>
                <FField label="Rows"><input style={S.input} type="number" value={field.rows ?? 5} onChange={e => u("rows", e.target.value)} /></FField>
                <FField label="Max Characters"><input style={S.input} type="number" value={field.maxChars ?? ""} onChange={e => u("maxChars", e.target.value)} /></FField>
              </div>
            </>
          )}

          {/* Number */}
          {t === "number" && (
            <>
              <div style={S.row2}>
                <FField label="Min Value"><input style={S.input} type="number" value={field.numberMin ?? ""} onChange={e => u("numberMin", e.target.value)} /></FField>
                <FField label="Max Value"><input style={S.input} type="number" value={field.numberMax ?? ""} onChange={e => u("numberMax", e.target.value)} /></FField>
              </div>
              <FField label="Number Format">
                <select style={S.select} value={field.numberFormat ?? "decimal"} onChange={e => u("numberFormat", e.target.value)}>
                  <option value="decimal">Decimal (1.23)</option>
                  <option value="integer">Integer (1)</option>
                </select>
              </FField>
              <FField label="Default Value"><input style={S.input} type="number" value={field.defaultValue} onChange={e => u("defaultValue", e.target.value)} /></FField>
            </>
          )}

          {/* Name */}
          {t === "name" && (
            <>
              <FField label="Format">
                <select style={S.select} value={field.nameFormat ?? "first-last"} onChange={e => u("nameFormat", e.target.value)}>
                  <option value="simple">Simple (single field)</option>
                  <option value="first-last">First + Last</option>
                  <option value="extended">Extended (Prefix, First, Middle, Last, Suffix)</option>
                </select>
              </FField>
              {field.nameFormat !== "simple" && (
                <FField label="Sub-Labels">
                  {(field.nameFormat === "extended" ? ["prefix","first","middle","last","suffix"] : ["first","last"]).map(k => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#646970", textTransform: "capitalize" }}>{k}</span>
                      <input style={S.input} value={field.subLabels?.[k] ?? k} onChange={e => u("subLabels", { ...(field.subLabels ?? {}), [k]: e.target.value })} />
                    </div>
                  ))}
                </FField>
              )}
            </>
          )}

          {/* Email */}
          {t === "email" && (
            <>
              <FField label="Default Value"><input style={S.input} value={field.defaultValue} onChange={e => u("defaultValue", e.target.value)} /></FField>
              <Toggle on={!!field.confirmEmail} onChange={v => u("confirmEmail", v)} label="Enable Email Confirmation Field" />
              {field.confirmEmail && (
                <FField label="Confirmation Placeholder"><input style={S.input} value={field.confirmPlaceholder ?? "Confirm Email"} onChange={e => u("confirmPlaceholder", e.target.value)} /></FField>
              )}
              <FField label="Restricted Email Domains" hint="One domain per line. Leave empty to allow all.">
                <textarea style={{ ...S.input, resize: "vertical", fontFamily: "monospace" }} rows={3} value={field.restrictedEmails ?? ""} onChange={e => u("restrictedEmails", e.target.value)} placeholder="example.com&#10;spam.org" />
              </FField>
            </>
          )}

          {/* Phone */}
          {t === "phone" && (
            <FField label="Phone Format">
              <select style={S.select} value={field.phoneFormat ?? "us"} onChange={e => u("phoneFormat", e.target.value)}>
                <option value="us">US Format: (201) 555-0123</option>
                <option value="international">International Format</option>
                <option value="smart">Smart (auto-detect)</option>
              </select>
            </FField>
          )}

          {/* Address */}
          {t === "address" && (
            <>
              <FField label="Address Scheme">
                <select style={S.select} value={field.addressScheme ?? "international"} onChange={e => u("addressScheme", e.target.value)}>
                  <option value="international">International</option>
                  <option value="us">US</option>
                  <option value="canadian">Canadian</option>
                  <option value="uk">UK</option>
                </select>
              </FField>
              <FField label="Enabled Sub-Fields">
                {["address1","address2","city","state","postal","country"].map(f2 => (
                  <label key={f2} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "12px", cursor: "pointer" }}>
                    <input type="checkbox" checked={!(field.hiddenSubfields ?? []).includes(f2)} onChange={e => { const hs = field.hiddenSubfields ?? []; u("hiddenSubfields", e.target.checked ? hs.filter((x: string) => x !== f2) : [...hs, f2]); }} />
                    {f2 === "address1" ? "Street Address" : f2 === "address2" ? "Address Line 2" : f2 === "postal" ? "Postal / Zip Code" : f2.charAt(0).toUpperCase() + f2.slice(1)}
                  </label>
                ))}
              </FField>
            </>
          )}

          {/* Date/Time */}
          {t === "date_time" && (
            <>
              <div style={{ display: "flex", gap: "20px" }}>
                <Toggle on={field.dateEnable ?? true} onChange={v => u("dateEnable", v)} label="Date" />
                <Toggle on={field.timeEnable ?? false} onChange={v => u("timeEnable", v)} label="Time" />
              </div>
              {(field.dateEnable ?? true) && (
                <>
                  <FField label="Date Type">
                    <select style={S.select} value={field.dateType ?? "datepicker"} onChange={e => u("dateType", e.target.value)}>
                      <option value="datepicker">Date Picker</option>
                      <option value="dropdown">Dropdowns</option>
                      <option value="text">Text Input</option>
                    </select>
                  </FField>
                  <FField label="Date Format">
                    <select style={S.select} value={field.dateFormat ?? "MM/DD/YYYY"} onChange={e => u("dateFormat", e.target.value)}>
                      {["MM/DD/YYYY","DD/MM/YYYY","YYYY-MM-DD","MM-DD-YYYY"].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </FField>
                  <FField label="First Day of Week">
                    <select style={S.select} value={String(field.firstDay ?? 0)} onChange={e => u("firstDay", Number(e.target.value))}>
                      {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </FField>
                </>
              )}
              {(field.timeEnable ?? false) && (
                <FField label="Time Format">
                  <select style={S.select} value={field.timeFormat ?? "12H"} onChange={e => u("timeFormat", e.target.value)}>
                    <option value="12H">12 Hour (1:00 PM)</option>
                    <option value="24H">24 Hour (13:00)</option>
                  </select>
                </FField>
              )}
            </>
          )}

          {/* Dropdown specific */}
          {t === "dropdown" && (
            <>
              <FField label="Placeholder" hint="Shown when nothing is selected"><input style={S.input} value={field.placeholder} onChange={e => u("placeholder", e.target.value)} placeholder="Select an option…" /></FField>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <Toggle on={!!field.allowMultiple} onChange={v => u("allowMultiple", v)} label="Allow Multiple Selections" />
                <Toggle on={!!field.allowOther} onChange={v => u("allowOther", v)} label="Allow 'Other'" />
                <Toggle on={!!field.randomize} onChange={v => u("randomize", v)} label="Randomize Choices" />
              </div>
            </>
          )}

          {/* Multiple choice / Checkboxes */}
          {(t === "multiple_choice" || t === "checkboxes") && (
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <FField label="Layout">
                <select style={{ ...S.select, width: "auto" }} value={field.choiceLayout ?? "vertical"} onChange={e => u("choiceLayout", e.target.value)}>
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="inline">Inline</option>
                </select>
              </FField>
              {t === "checkboxes" && <Toggle on={!!field.selectAll} onChange={v => u("selectAll", v)} label="Select All" />}
              <Toggle on={!!field.allowOther} onChange={v => u("allowOther", v)} label="Allow 'Other'" />
              <Toggle on={!!field.randomize} onChange={v => u("randomize", v)} label="Randomize" />
              <Toggle on={!!field.imageChoices} onChange={v => u("imageChoices", v)} label="Use Image Choices" />
            </div>
          )}

          {/* File Upload */}
          {t === "file" && (
            <>
              <FField label="Allowed File Extensions" hint="Comma-separated. Leave empty to allow all.">
                <input style={S.input} value={field.fileExtensions ?? "jpg,jpeg,png,gif,pdf,doc,docx"} onChange={e => u("fileExtensions", e.target.value)} />
              </FField>
              <div style={S.row2}>
                <FField label="Max File Size (MB)"><input style={S.input} type="number" value={field.fileMaxSize ?? "10"} onChange={e => u("fileMaxSize", e.target.value)} /></FField>
                <FField label="Max Number of Files"><input style={S.input} type="number" value={field.fileMaxCount ?? "1"} onChange={e => u("fileMaxCount", e.target.value)} /></FField>
              </div>
              <FField label="Upload Style">
                <select style={S.select} value={field.fileStyle ?? "classic"} onChange={e => u("fileStyle", e.target.value)}>
                  <option value="classic">Classic</option>
                  <option value="modern">Modern (Drag & Drop)</option>
                </select>
              </FField>
            </>
          )}

          {/* Rating */}
          {t === "rating" && (
            <>
              <div style={S.row2}>
                <FField label="Number of Icons">
                  <select style={S.select} value={String(field.ratingCount ?? 5)} onChange={e => u("ratingCount", Number(e.target.value))}>
                    {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FField>
                <FField label="Icon">
                  <select style={S.select} value={field.ratingIcon ?? "star"} onChange={e => u("ratingIcon", e.target.value)}>
                    <option value="star">Star ⭐</option>
                    <option value="heart">Heart ❤️</option>
                    <option value="thumb">Thumb 👍</option>
                    <option value="smiley">Smiley 😊</option>
                    <option value="bullet">Bullet •</option>
                  </select>
                </FField>
                <FField label="Icon Size">
                  <select style={S.select} value={field.ratingSize ?? "medium"} onChange={e => u("ratingSize", e.target.value)}>
                    <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                  </select>
                </FField>
                <FField label="Icon Color"><input style={S.input} type="color" value={field.ratingColor ?? "#f5a623"} onChange={e => u("ratingColor", e.target.value)} /></FField>
              </div>
            </>
          )}

          {/* Likert */}
          {t === "likert" && (
            <>
              <FField label="Rows (Questions)">
                {(field.rows ?? ["Row 1"]).map((r: string, i: number) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px", marginBottom: "4px" }}>
                    <input style={S.input} value={r} onChange={e => { const rows = [...(field.rows ?? [])]; rows[i] = e.target.value; u("rows", rows); }} />
                    <button onClick={() => { const rows = (field.rows ?? []).filter((_: any, j: number) => j !== i); u("rows", rows); }} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "16px" }}>×</button>
                  </div>
                ))}
                <button onClick={() => u("rows", [...(field.rows ?? []), `Row ${(field.rows ?? []).length + 1}`])} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px solid #2271b1", borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>+ Add Row</button>
              </FField>
              <FField label="Columns (Responses)">
                {(field.columns ?? ["Column 1"]).map((c: string, i: number) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px", marginBottom: "4px" }}>
                    <input style={S.input} value={c} onChange={e => { const cols = [...(field.columns ?? [])]; cols[i] = e.target.value; u("columns", cols); }} />
                    <button onClick={() => u("columns", (field.columns ?? []).filter((_: any, j: number) => j !== i))} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "16px" }}>×</button>
                  </div>
                ))}
                <button onClick={() => u("columns", [...(field.columns ?? []), `Column ${(field.columns ?? []).length + 1}`])} style={{ fontSize: "12px", color: "#2271b1", background: "none", border: "1px solid #2271b1", borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>+ Add Column</button>
              </FField>
            </>
          )}

          {/* Page Break */}
          {t === "page_break" && (
            <>
              <FField label="Page Title"><input style={S.input} value={field.pageTitle ?? ""} onChange={e => u("pageTitle", e.target.value)} /></FField>
              <div style={S.row2}>
                <FField label="Next Button Text"><input style={S.input} value={field.nextText ?? "Next"} onChange={e => u("nextText", e.target.value)} /></FField>
                <FField label="Previous Button Text"><input style={S.input} value={field.prevText ?? "Previous"} onChange={e => u("prevText", e.target.value)} /></FField>
              </div>
              <Toggle on={field.showPrev !== false} onChange={v => u("showPrev", v)} label="Show Previous Button" />
            </>
          )}

          {/* Section Divider */}
          {t === "section_divider" && (
            <>
              <FField label="Size">
                <select style={S.select} value={field.size ?? "medium"} onChange={e => u("size", e.target.value)}>
                  <option value="small">Small (H4)</option><option value="medium">Medium (H3)</option><option value="large">Large (H2)</option>
                </select>
              </FField>
              <FField label="Description"><textarea style={{ ...S.input, resize: "vertical" }} rows={2} value={field.description} onChange={e => u("description", e.target.value)} /></FField>
            </>
          )}

          {/* Hidden */}
          {t === "hidden" && (
            <div>
              <FField label="Default Value"><input style={S.input} value={field.defaultValue} onChange={e => u("defaultValue", e.target.value)} /></FField>
              <div style={{ marginTop: "6px" }}><SmartTagPicker onInsert={tag => u("defaultValue", (field.defaultValue ?? "") + tag)} /></div>
            </div>
          )}

          {/* Signature */}
          {t === "signature" && (
            <div style={S.row2}>
              <FField label="Pen Color"><input style={S.input} type="color" value={field.penColor ?? "#000000"} onChange={e => u("penColor", e.target.value)} /></FField>
              <FField label="Pen Size">
                <select style={S.select} value={field.penSize ?? "medium"} onChange={e => u("penSize", e.target.value)}>
                  <option value="small">Small (2px)</option><option value="medium">Medium (4px)</option><option value="large">Large (6px)</option>
                </select>
              </FField>
            </div>
          )}

          {/* Password */}
          {t === "password" && (
            <>
              <Toggle on={!!field.showStrength} onChange={v => u("showStrength", v)} label="Show Password Strength Indicator" />
              <Toggle on={!!field.confirmPassword} onChange={v => u("confirmPassword", v)} label="Enable Confirm Password Field" />
            </>
          )}

          {/* Payment Single */}
          {t === "payment_single" && (
            <>
              <FField label="Item Name"><input style={S.input} value={field.itemName ?? ""} onChange={e => u("itemName", e.target.value)} /></FField>
              <FField label="Item Price ($)"><input style={S.input} value={field.itemPrice ?? ""} onChange={e => u("itemPrice", e.target.value)} placeholder="0.00" /></FField>
              <Toggle on={!!field.customAmount} onChange={v => u("customAmount", v)} label="Allow Customer to Enter Amount" />
            </>
          )}

          {/* NPS */}
          {t === "nps" && (
            <div style={S.row2}>
              <FField label="0 = (Score Start Label)"><input style={S.input} value={field.npsStart ?? "Not at all likely"} onChange={e => u("npsStart", e.target.value)} /></FField>
              <FField label="10 = (Score End Label)"><input style={S.input} value={field.npsEnd ?? "Extremely likely"} onChange={e => u("npsEnd", e.target.value)} /></FField>
            </div>
          )}

          {/* Range Slider */}
          {t === "range_slider" && (
            <>
              <div style={S.row2}>
                <FField label="Min"><input style={S.input} type="number" value={field.min ?? 0} onChange={e => u("min", Number(e.target.value))} /></FField>
                <FField label="Max"><input style={S.input} type="number" value={field.max ?? 100} onChange={e => u("max", Number(e.target.value))} /></FField>
                <FField label="Step"><input style={S.input} type="number" value={field.step ?? 1} onChange={e => u("step", Number(e.target.value))} /></FField>
                <FField label="Default Value"><input style={S.input} type="number" value={field.defaultValue ?? 50} onChange={e => u("defaultValue", Number(e.target.value))} /></FField>
              </div>
              <FField label="Handles">
                <select style={S.select} value={field.handles ?? "single"} onChange={e => u("handles", e.target.value)}>
                  <option value="single">Single Handle</option>
                  <option value="range">Range (Two Handles)</option>
                </select>
              </FField>
              <div style={S.row2}>
                <FField label="Unit Prefix (e.g. $)"><input style={S.input} value={field.unitPrefix ?? ""} onChange={e => u("unitPrefix", e.target.value)} /></FField>
                <FField label="Unit Suffix (e.g. km)"><input style={S.input} value={field.unitSuffix ?? ""} onChange={e => u("unitSuffix", e.target.value)} /></FField>
              </div>
              <Toggle on={!!field.displayValue} onChange={v => u("displayValue", v)} label="Display Value Above Slider" />
            </>
          )}

          {/* CAPTCHA */}
          {t === "captcha" && (
            <>
              <FField label="CAPTCHA Provider">
                <select style={S.select} value={field.captchaType ?? "hcaptcha"} onChange={e => u("captchaType", e.target.value)}>
                  <option value="hcaptcha">hCaptcha</option>
                  <option value="recaptcha_v2">reCAPTCHA v2</option>
                  <option value="recaptcha_v3">reCAPTCHA v3</option>
                  <option value="turnstile">Cloudflare Turnstile</option>
                  <option value="math">Simple Math (built-in)</option>
                </select>
              </FField>
              {field.captchaType !== "math" && (
                <>
                  <FField label="Site Key"><input style={S.input} value={field.siteKey ?? ""} onChange={e => u("siteKey", e.target.value)} /></FField>
                  <FField label="Secret Key"><input style={S.input} type="password" value={field.secretKey ?? ""} onChange={e => u("secretKey", e.target.value)} /></FField>
                  <div style={S.row2}>
                    <FField label="Theme">
                      <select style={S.select} value={field.captchaTheme ?? "light"} onChange={e => u("captchaTheme", e.target.value)}>
                        <option value="light">Light</option><option value="dark">Dark</option>
                      </select>
                    </FField>
                    <FField label="Size">
                      <select style={S.select} value={field.captchaSize ?? "normal"} onChange={e => u("captchaSize", e.target.value)}>
                        <option value="normal">Normal</option><option value="compact">Compact</option>
                        {field.captchaType === "recaptcha_v2" && <option value="invisible">Invisible</option>}
                      </select>
                    </FField>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {section === "advanced" && (
        <div style={{ display: "grid", gap: "14px" }}>
          <FField label="CSS Class" hint="Separate multiple classes with spaces"><input style={S.input} value={field.cssClass} onChange={e => u("cssClass", e.target.value)} /></FField>
          {!["page_break","section_divider","html","content"].includes(t) && (
            <>
              <Toggle on={!!field.hideLabel} onChange={v => u("hideLabel", v)} label="Hide Label" />
              <FField label="Admin Label" hint="Used only in the admin panel, not visible to users"><input style={S.input} value={field.adminLabel ?? ""} onChange={e => u("adminLabel", e.target.value)} /></FField>
            </>
          )}
          {!["page_break","section_divider","html","content","captcha","rating","likert","signature","file"].includes(t) && (
            <>
              <FField label="Default Value">
                <input style={S.input} value={field.defaultValue} onChange={e => u("defaultValue", e.target.value)} />
                <div style={{ marginTop: "4px" }}><SmartTagPicker onInsert={tag => u("defaultValue", (field.defaultValue ?? "") + tag)} /></div>
              </FField>
              <FField label="Prepopulate via URL parameter">
                <input style={S.input} value={field.prepopulate ?? ""} onChange={e => u("prepopulate", e.target.value)} placeholder="e.g. field_name" />
              </FField>
            </>
          )}
        </div>
      )}

      {section === "smart_logic" && (
        <ConditionalLogicEditor cl={field.conditionalLogic} onChange={v => u("conditionalLogic", v)} fields={allFields} />
      )}
    </div>
  );
}

// ─── Canvas Field Row ─────────────────────────────────────────────────────────

function CanvasField({ field, selected, onSelect, onDelete, onDuplicate, onMove, isFirst, isLast, isDragOver, onDragStart, onDragOver, onDrop }: {
  field: FormField; selected: boolean; onSelect: () => void;
  onDelete: () => void; onDuplicate: () => void; onMove: (d: -1|1) => void;
  isFirst: boolean; isLast: boolean; isDragOver: boolean;
  onDragStart: () => void; onDragOver: () => void; onDrop: () => void;
}) {
  const m = FIELDS[field.type];
  const isLayout = ["page_break","section_divider","html","content"].includes(field.type);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? "#2271b1" : isDragOver ? "#f0a500" : "#dcdcde"}`,
        borderRadius: "3px", marginBottom: "4px", cursor: "pointer", userSelect: "none",
        background: selected ? "#f0f6fc" : "#fff",
        borderLeft: `3px solid ${selected ? "#2271b1" : isLayout ? "#a0a0a0" : "#dcdcde"}`,
        opacity: isDragOver ? 0.7 : 1,
        transition: "border-color 0.15s",
      }}
    >
      {field.type === "page_break" ? (
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>📄</span>
          <span style={{ flex: 1, fontSize: "12px", fontWeight: 700, color: "#646970", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Page Break — {field.nextText ?? "Next"}
          </span>
        </div>
      ) : field.type === "section_divider" ? (
        <div style={{ padding: "10px 14px" }}>
          <div style={{ borderTop: "2px solid #dcdcde", position: "relative" }}>
            <span style={{ position: "absolute", top: "-10px", left: "12px", background: selected ? "#f0f6fc" : "#fff", padding: "0 8px", fontSize: "13px", fontWeight: 600, color: "#1d2327" }}>{field.label}</span>
          </div>
        </div>
      ) : (
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#c3c4c7", cursor: "grab" }}>⠿⠿</span>
          <span style={{ fontSize: "16px", width: "22px", textAlign: "center", flexShrink: 0 }}>{m?.icon ?? "?"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!field.hideLabel && <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d2327" }}>{field.label || "Untitled"}</span>}
            {field.required && <span style={{ color: "#d63638", marginLeft: "4px", fontWeight: 700 }}>*</span>}
            {field.adminLabel && <span style={{ fontSize: "11px", color: "#2271b1", marginLeft: "6px" }}>({field.adminLabel})</span>}
          </div>
          <span style={{ fontSize: "10px", background: "#f0f0f1", color: "#50575e", padding: "2px 6px", borderRadius: "8px", flexShrink: 0 }}>{m?.label ?? field.type}</span>
          <div style={{ display: "flex", gap: "3px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onMove(-1)} disabled={isFirst} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "2px", padding: "1px 5px", cursor: "pointer", fontSize: "10px", color: isFirst ? "#c3c4c7" : "#646970" }}>▲</button>
            <button onClick={() => onMove(1)} disabled={isLast} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "2px", padding: "1px 5px", cursor: "pointer", fontSize: "10px", color: isLast ? "#c3c4c7" : "#646970" }}>▼</button>
            <button onClick={onDuplicate} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "2px", padding: "1px 5px", cursor: "pointer", fontSize: "10px", color: "#646970" }} title="Duplicate">⧉</button>
            <button onClick={onDelete} style={{ background: "none", border: "1px solid #dcdcde", borderRadius: "2px", padding: "1px 5px", cursor: "pointer", fontSize: "10px", color: "#d63638" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form Settings Tab ────────────────────────────────────────────────────────

function SettingsTab({ settings, onChange }: { settings: FormSettings; onChange: (s: FormSettings) => void }) {
  const u = (k: keyof FormSettings, v: any) => onChange({ ...settings, [k]: v });
  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "680px" }}>
      {/* Submit Button */}
      <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#f6f7f7", borderBottom: "1px solid #dcdcde", fontSize: "13px", fontWeight: 700, color: "#1d2327" }}>Submit Button</div>
        <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
          <div style={S.row2}>
            <FField label="Button Text"><input style={S.input} value={settings.submitText} onChange={e => u("submitText", e.target.value)} /></FField>
            <FField label="Processing Text"><input style={S.input} value={settings.submitProcessingText} onChange={e => u("submitProcessingText", e.target.value)} /></FField>
          </div>
          <FField label="Alignment">
            <select style={S.select} value={settings.submitAlign} onChange={e => u("submitAlign", e.target.value)}>
              <option value="left">Left</option><option value="center">Center</option>
              <option value="right">Right</option><option value="full">Full Width</option>
            </select>
          </FField>
        </div>
      </div>

      {/* Layout */}
      <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#f6f7f7", borderBottom: "1px solid #dcdcde", fontSize: "13px", fontWeight: 700, color: "#1d2327" }}>Layout & Styling</div>
        <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
          <FField label="Label Alignment">
            <select style={S.select} value={settings.labelAlignment} onChange={e => u("labelAlignment", e.target.value)}>
              <option value="top">Top</option><option value="left">Left</option>
              <option value="right">Right</option><option value="hidden">Hidden</option>
            </select>
          </FField>
          <FField label="Form CSS Class"><input style={S.input} value={settings.formClass} onChange={e => u("formClass", e.target.value)} /></FField>
        </div>
      </div>

      {/* Spam & Security */}
      <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#f6f7f7", borderBottom: "1px solid #dcdcde", fontSize: "13px", fontWeight: 700, color: "#1d2327" }}>Spam Protection & Security</div>
        <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
          <Toggle on={settings.honeypot} onChange={v => u("honeypot", v)} label="Honeypot Protection (recommended)" />
          <Toggle on={settings.ajax} onChange={v => u("ajax", v)} label="AJAX Form Submission" />
        </div>
      </div>

      {/* Form Locker */}
      <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#f6f7f7", borderBottom: "1px solid #dcdcde", fontSize: "13px", fontWeight: 700, color: "#1d2327" }}>Form Locker</div>
        <div style={{ padding: "16px", display: "grid", gap: "16px" }}>
          <div>
            <Toggle on={settings.requireLogin} onChange={v => u("requireLogin", v)} label="Require User Login" />
            {settings.requireLogin && <div style={{ marginTop: "8px" }}><FField label="Not Logged In Message"><input style={S.input} value={settings.requireLoginMessage} onChange={e => u("requireLoginMessage", e.target.value)} /></FField></div>}
          </div>
          <div>
            <Toggle on={settings.limitEntries} onChange={v => u("limitEntries", v)} label="Limit Number of Entries" />
            {settings.limitEntries && (
              <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                <div style={S.row2}>
                  <FField label="Max Entries"><input style={S.input} type="number" value={settings.limitEntriesCount} onChange={e => u("limitEntriesCount", Number(e.target.value))} /></FField>
                </div>
                <FField label="Form Closed Message"><input style={S.input} value={settings.limitEntriesMessage} onChange={e => u("limitEntriesMessage", e.target.value)} /></FField>
              </div>
            )}
          </div>
          <div>
            <Toggle on={settings.scheduleForm} onChange={v => u("scheduleForm", v)} label="Schedule Form" />
            {settings.scheduleForm && (
              <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                <div style={S.row2}>
                  <FField label="Start Date/Time"><input style={S.input} type="datetime-local" value={settings.scheduleStart} onChange={e => u("scheduleStart", e.target.value)} /></FField>
                  <FField label="End Date/Time"><input style={S.input} type="datetime-local" value={settings.scheduleEnd} onChange={e => u("scheduleEnd", e.target.value)} /></FField>
                </div>
                <FField label="Form Closed Message"><input style={S.input} value={settings.scheduleClosedMessage} onChange={e => u("scheduleClosedMessage", e.target.value)} /></FField>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entries */}
      <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#f6f7f7", borderBottom: "1px solid #dcdcde", fontSize: "13px", fontWeight: 700, color: "#1d2327" }}>Entry Management</div>
        <div style={{ padding: "16px" }}>
          <Toggle on={settings.storeEntries !== false} onChange={v => u("storeEntries", v)} label="Store Entry Information in Database" />
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ notifs, onChange, fields }: { notifs: Notification[]; onChange: (n: Notification[]) => void; fields: FormField[] }) {
  const [editId, setEditId] = useState<string | null>(notifs[0]?.id ?? null);
  const editing = notifs.find(n => n.id === editId);
  const add = () => {
    const n: Notification = { id: uid(), name: `Notification ${notifs.length + 1}`, active: true, toAddress: "{admin_email}", fromName: "{site_name}", fromEmail: "{admin_email}", replyTo: "", subject: "New Entry: {form_title}", message: "{all_fields}", conditionalLogic: false };
    onChange([...notifs, n]); setEditId(n.id);
  };
  const upd = (patch: Partial<Notification>) => onChange(notifs.map(n => n.id === editId ? { ...n, ...patch } : n));
  const del = (id: string) => { onChange(notifs.filter(n => n.id !== id)); if (editId === id) setEditId(notifs.find(n => n.id !== id)?.id ?? null); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "20px" }}>
      {/* List */}
      <div>
        {notifs.map(n => (
          <div key={n.id} onClick={() => setEditId(n.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: `1px solid ${editId === n.id ? "#2271b1" : "#dcdcde"}`, borderRadius: "3px", marginBottom: "4px", cursor: "pointer", background: editId === n.id ? "#f0f6fc" : "#fff" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1d2327" }}>{n.name}</div>
              <div style={{ fontSize: "11px", color: n.active ? "#146c43" : "#646970" }}>{n.active ? "Active" : "Inactive"}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); del(n.id); }} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "14px" }}>×</button>
          </div>
        ))}
        <button onClick={add} style={{ display: "block", width: "100%", padding: "8px", fontSize: "12px", background: "none", border: "1px dashed #2271b1", borderRadius: "3px", color: "#2271b1", cursor: "pointer" }}>+ Add Notification</button>
      </div>

      {/* Editor */}
      {editing ? (
        <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", padding: "20px", display: "grid", gap: "14px" }}>
          <div style={S.row2}>
            <FField label="Notification Name"><input style={S.input} value={editing.name} onChange={e => upd({ name: e.target.value })} /></FField>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}><Toggle on={editing.active} onChange={v => upd({ active: v })} label="Active" /></div>
          </div>
          <FField label="Send To Email Address" hint="Separate multiple with commas. Supports smart tags.">
            <input style={S.input} value={editing.toAddress} onChange={e => upd({ toAddress: e.target.value })} />
            <SmartTagPicker onInsert={tag => upd({ toAddress: editing.toAddress + tag })} />
          </FField>
          <div style={S.row2}>
            <FField label="From Name"><input style={S.input} value={editing.fromName} onChange={e => upd({ fromName: e.target.value })} /></FField>
            <FField label="From Email"><input style={S.input} value={editing.fromEmail} onChange={e => upd({ fromEmail: e.target.value })} /></FField>
          </div>
          <FField label="Reply-To"><input style={S.input} value={editing.replyTo} onChange={e => upd({ replyTo: e.target.value })} /></FField>
          <FField label="Email Subject"><input style={S.input} value={editing.subject} onChange={e => upd({ subject: e.target.value })} /></FField>
          <FField label="Email Message">
            <textarea style={{ ...S.input, resize: "vertical" }} rows={6} value={editing.message} onChange={e => upd({ message: e.target.value })} />
            <SmartTagPicker onInsert={tag => upd({ message: editing.message + tag })} />
          </FField>
          <div style={{ background: "#f6f7f7", border: "1px solid #dcdcde", borderRadius: "3px", padding: "12px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1d2327", margin: "0 0 10px" }}>Conditional Logic</p>
            <ConditionalLogicEditor cl={editing.conditionalLogic} onChange={v => upd({ conditionalLogic: v })} fields={fields} />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#646970", fontSize: "13px" }}>
          Select a notification to edit, or add a new one.
        </div>
      )}
    </div>
  );
}

// ─── Confirmations Tab ────────────────────────────────────────────────────────

function ConfirmationsTab({ confs, onChange, fields }: { confs: Confirmation[]; onChange: (c: Confirmation[]) => void; fields: FormField[] }) {
  const [editId, setEditId] = useState<string | null>(confs[0]?.id ?? null);
  const editing = confs.find(c => c.id === editId);
  const add = () => {
    const c: Confirmation = { id: uid(), name: `Confirmation ${confs.length + 1}`, active: true, type: "message", message: "<p>Thanks for your submission!</p>", redirectUrl: "", page: "", autoScroll: true, conditionalLogic: false };
    onChange([...confs, c]); setEditId(c.id);
  };
  const upd = (patch: Partial<Confirmation>) => onChange(confs.map(c => c.id === editId ? { ...c, ...patch } : c));
  const del = (id: string) => { onChange(confs.filter(c => c.id !== id)); if (editId === id) setEditId(confs.find(c => c.id !== id)?.id ?? null); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "20px" }}>
      <div>
        {confs.map(c => (
          <div key={c.id} onClick={() => setEditId(c.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: `1px solid ${editId === c.id ? "#2271b1" : "#dcdcde"}`, borderRadius: "3px", marginBottom: "4px", cursor: "pointer", background: editId === c.id ? "#f0f6fc" : "#fff" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1d2327" }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: "#646970" }}>{c.type}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); del(c.id); }} style={{ background: "none", border: "none", color: "#d63638", cursor: "pointer", fontSize: "14px" }}>×</button>
          </div>
        ))}
        <button onClick={add} style={{ display: "block", width: "100%", padding: "8px", fontSize: "12px", background: "none", border: "1px dashed #2271b1", borderRadius: "3px", color: "#2271b1", cursor: "pointer" }}>+ Add Confirmation</button>
      </div>

      {editing ? (
        <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", padding: "20px", display: "grid", gap: "14px" }}>
          <div style={S.row2}>
            <FField label="Confirmation Name"><input style={S.input} value={editing.name} onChange={e => upd({ name: e.target.value })} /></FField>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}><Toggle on={editing.active} onChange={v => upd({ active: v })} label="Active" /></div>
          </div>
          <FField label="Confirmation Type">
            <select style={S.select} value={editing.type} onChange={e => upd({ type: e.target.value as any })}>
              <option value="message">Message</option>
              <option value="redirect">Go to URL (Redirect)</option>
              <option value="page">Show Page</option>
            </select>
          </FField>
          {editing.type === "message" && (
            <FField label="Confirmation Message">
              <textarea style={{ ...S.input, resize: "vertical" }} rows={5} value={editing.message} onChange={e => upd({ message: e.target.value })} />
              <SmartTagPicker onInsert={tag => upd({ message: editing.message + tag })} />
              <p style={S.hint}>Supports HTML. Use smart tags to include submitted field values.</p>
            </FField>
          )}
          {editing.type === "redirect" && (
            <FField label="Redirect URL">
              <input style={S.input} value={editing.redirectUrl} onChange={e => upd({ redirectUrl: e.target.value })} placeholder="https://example.com/thank-you" />
              <SmartTagPicker onInsert={tag => upd({ redirectUrl: editing.redirectUrl + tag })} />
            </FField>
          )}
          {editing.type === "page" && (
            <FField label="Page URL"><input style={S.input} value={editing.page} onChange={e => upd({ page: e.target.value })} placeholder="/thank-you" /></FField>
          )}
          <Toggle on={editing.autoScroll} onChange={v => upd({ autoScroll: v })} label="Auto-scroll to Confirmation" />
          <div style={{ background: "#f6f7f7", border: "1px solid #dcdcde", borderRadius: "3px", padding: "12px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1d2327", margin: "0 0 10px" }}>Conditional Logic</p>
            <ConditionalLogicEditor cl={editing.conditionalLogic} onChange={v => upd({ conditionalLogic: v })} fields={fields} />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#646970", fontSize: "13px" }}>
          Select a confirmation to edit, or add a new one.
        </div>
      )}
    </div>
  );
}

// ─── Embed Panel ──────────────────────────────────────────────────────────────

function EmbedPanel({ formId }: { formId: string }) {
  const [copied, setCopied] = useState("");
  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); };
  const url = `/forms/${formId}`;
  const iframe = `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}${url}" width="100%" frameborder="0" scrolling="no" onload="window.parent.scrollTo(0,0)"></iframe>`;
  const shortcode = `[wpforms id="${formId}"]`;

  return (
    <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 200, background: "#fff", border: "1px solid #dcdcde", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", padding: "16px", width: "400px", marginTop: "4px" }}>
      <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "12px", color: "#1d2327" }}>Embed Form</p>
      {[
        { label: "Public URL", value: url, key: "url" },
        { label: "iFrame Embed", value: iframe, key: "iframe" },
        { label: "Shortcode", value: shortcode, key: "shortcode" },
      ].map(item => (
        <div key={item.key} style={{ marginBottom: "12px" }}>
          <label style={S.label}>{item.label}</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input readOnly value={item.value} style={{ ...S.input, fontFamily: "monospace", fontSize: "11px", background: "#f6f7f7" }} />
            <button onClick={() => copy(item.value, item.key)} style={{ padding: "6px 10px", background: copied === item.key ? "#146c43" : "#2271b1", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px", flexShrink: 0 }}>
              {copied === item.key ? "✓" : "Copy"}
            </button>
          </div>
        </div>
      ))}
      <a href={url} target="_blank" style={{ display: "block", textAlign: "center", padding: "8px", background: "#f0f6fc", border: "1px solid #c3d9f7", borderRadius: "3px", color: "#2271b1", fontSize: "12px", textDecoration: "none" }}>
        Preview Form →
      </a>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function FormBuilder({ formId }: { formId?: string }) {
  const [form, setForm] = useState<WPForm | null>(null);
  const [tab, setTab] = useState<"fields"|"settings"|"notifications"|"confirmations">("fields");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fieldCategory, setFieldCategory] = useState("Standard");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    if (formId) {
      fetch(`/api/forms/${formId}`).then(r => r.ok ? r.json() : null).then(d => {
        if (d) { setForm(d); } else { const f = defaultForm(); f.id = formId; setForm(f); }
      }).catch(() => { const f = defaultForm(); f.id = formId; setForm(f); });
    } else {
      setForm(defaultForm());
    }
  }, [formId]);

  const save = async () => {
    if (!form) return;
    setSaving(true); setStatus("Saving…");
    try {
      const res = await fetch("/api/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) {
        setStatus("Saved ✓");
        if (!formId) { const d = await res.json(); window.location.href = `/admin/forms/${d.form?.id ?? form.id}`; }
        setTimeout(() => setStatus(""), 3000);
      } else { setStatus("Error saving"); }
    } catch { setStatus("Error saving"); }
    setSaving(false);
  };

  const deleteForm = async () => {
    if (!formId || !confirm("Delete this form and all its entries? This cannot be undone.")) return;
    await fetch(`/api/forms/${formId}`, { method: "DELETE" });
    window.location.href = "/admin/forms";
  };

  if (!form) return <div style={{ padding: "40px", textAlign: "center", color: "#646970" }}>Loading…</div>;

  const selectedField = form.fields.find(f => f.id === selectedId) ?? null;

  const addField = (type: string) => {
    const f = createField(type);
    setForm({ ...form, fields: [...form.fields, f] });
    setSelectedId(f.id);
  };

  const updateField = (id: string, patch: Partial<FormField>) =>
    setForm({ ...form, fields: form.fields.map(f => f.id === id ? { ...f, ...patch } : f) });

  const deleteField = (id: string) => {
    setForm({ ...form, fields: form.fields.filter(f => f.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateField = (id: string) => {
    const src = form.fields.find(f => f.id === id);
    if (!src) return;
    const copy = { ...src, id: uid() };
    const idx = form.fields.findIndex(f => f.id === id);
    const arr = [...form.fields];
    arr.splice(idx + 1, 0, copy);
    setForm({ ...form, fields: arr });
    setSelectedId(copy.id);
  };

  const moveField = (id: string, dir: -1|1) => {
    const idx = form.fields.findIndex(f => f.id === id);
    if (idx + dir < 0 || idx + dir >= form.fields.length) return;
    const arr = [...form.fields];
    [arr[idx], arr[idx+dir]] = [arr[idx+dir], arr[idx]];
    setForm({ ...form, fields: arr });
  };

  const dropField = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const arr = [...form.fields];
    const from = arr.findIndex(f => f.id === dragId);
    const to = arr.findIndex(f => f.id === targetId);
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setForm({ ...form, fields: arr });
    setDragId(null); setDragOverId(null);
  };

  const categoryFields = Object.entries(FIELDS).filter(([, m]) => m.category === fieldCategory);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", margin: "-28px -32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", background: "#fff", borderBottom: "1px solid #dcdcde", flexShrink: 0 }}>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          style={{ flex: 1, fontSize: "18px", fontWeight: 700, border: "none", outline: "none", background: "transparent", color: "#1d2327" }} placeholder="Form Title" />
        <span style={{ fontSize: "13px", color: "#646970" }}>{status}</span>
        {formId && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowEmbed(!showEmbed)} style={{ fontSize: "12px", background: "#f6f7f7", color: "#1d2327", border: "1px solid #dcdcde", padding: "7px 14px", borderRadius: "3px", cursor: "pointer" }}>
              Embed ▾
            </button>
            {showEmbed && <EmbedPanel formId={formId} />}
          </div>
        )}
        {formId && (
          <a href={`/admin/forms/${formId}/entries`} style={{ fontSize: "12px", background: "#f6f7f7", color: "#1d2327", border: "1px solid #dcdcde", padding: "7px 14px", borderRadius: "3px", textDecoration: "none" }}>
            Entries
          </a>
        )}
        {formId && (
          <button onClick={deleteForm} style={{ fontSize: "12px", color: "#d63638", background: "#fff", border: "1px solid #d63638", padding: "7px 14px", borderRadius: "3px", cursor: "pointer" }}>Delete</button>
        )}
        <button onClick={save} disabled={saving} style={{ background: "#2271b1", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "3px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          {saving ? "Saving…" : "Save Form"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, background: "#fff", borderBottom: "1px solid #dcdcde", padding: "0 20px", flexShrink: 0 }}>
        {(["fields","settings","notifications","confirmations"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 16px", border: "none", background: "none", borderBottom: t === tab ? "2px solid #2271b1" : "2px solid transparent", color: t === tab ? "#2271b1" : "#646970", fontWeight: t === tab ? 600 : 400, cursor: "pointer", fontSize: "13px", textTransform: "capitalize" }}>
            {t}
            {t === "fields" && ` (${form.fields.length})`}
            {t === "notifications" && ` (${form.notifications.length})`}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {tab === "fields" && (
          <>
            {/* Left: Field Type Panel */}
            <div style={{ width: "200px", borderRight: "1px solid #dcdcde", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #dcdcde", fontSize: "11px", fontWeight: 700, color: "#646970", textTransform: "uppercase", letterSpacing: "0.5px" }}>Add Fields</div>
              <div style={{ display: "flex", gap: 0, overflowX: "auto", borderBottom: "1px solid #dcdcde" }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setFieldCategory(cat)} style={{ padding: "6px 8px", border: "none", background: "none", borderBottom: cat === fieldCategory ? "2px solid #2271b1" : "2px solid transparent", color: cat === fieldCategory ? "#2271b1" : "#646970", cursor: "pointer", fontSize: "10px", fontWeight: cat === fieldCategory ? 700 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {cat}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                {categoryFields.map(([type, meta]) => (
                  <button key={type} onClick={() => addField(type)} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 10px", border: "1px solid #dcdcde", borderRadius: "3px", background: "#fff", cursor: "pointer", fontSize: "12px", color: "#1d2327", textAlign: "left", marginBottom: "3px" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f0f6fc"; e.currentTarget.style.borderColor = "#2271b1"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#dcdcde"; }}>
                    <span style={{ fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 }}>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Center: Canvas */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f6f7f7" }} onClick={() => setSelectedId(null)}>
              {form.fields.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#646970", border: "2px dashed #dcdcde", borderRadius: "4px", background: "#fff" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Add fields from the left panel</div>
                  <div style={{ fontSize: "12px" }}>Click a field type to add it to your form</div>
                </div>
              ) : (
                <div onClick={e => e.stopPropagation()}>
                  {form.fields.map((field, idx) => (
                    <CanvasField key={field.id} field={field}
                      selected={selectedId === field.id}
                      onSelect={() => setSelectedId(selectedId === field.id ? null : field.id)}
                      onDelete={() => deleteField(field.id)}
                      onDuplicate={() => duplicateField(field.id)}
                      onMove={dir => moveField(field.id, dir)}
                      isFirst={idx === 0} isLast={idx === form.fields.length - 1}
                      isDragOver={dragOverId === field.id}
                      onDragStart={() => setDragId(field.id)}
                      onDragOver={() => setDragOverId(field.id)}
                      onDrop={() => dropField(field.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Settings Panel */}
            <div style={{ width: "300px", borderLeft: "1px solid #dcdcde", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
              {selectedField ? (
                <>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #dcdcde", display: "flex", alignItems: "center", gap: "8px", background: "#f6f7f7" }}>
                    <span style={{ fontSize: "16px" }}>{FIELDS[selectedField.type]?.icon ?? "?"}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1d2327", flex: 1 }}>Field Options</span>
                    <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#646970", fontSize: "16px" }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                    <FieldSettings field={selectedField} update={patch => updateField(selectedField.id, patch)} allFields={form.fields} />
                  </div>
                </>
              ) : (
                <div style={{ padding: "20px", color: "#646970", fontSize: "13px", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>⚙️</div>
                  <div style={{ fontWeight: 600, marginBottom: "6px" }}>Field Options</div>
                  <div>Click on a field in the form to edit its settings.</div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "settings" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <SettingsTab settings={form.settings} onChange={s => setForm({ ...form, settings: s })} />
          </div>
        )}

        {tab === "notifications" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <NotificationsTab notifs={form.notifications} onChange={n => setForm({ ...form, notifications: n })} fields={form.fields} />
          </div>
        )}

        {tab === "confirmations" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <ConfirmationsTab confs={form.confirmations} onChange={c => setForm({ ...form, confirmations: c })} fields={form.fields} />
          </div>
        )}
      </div>
    </div>
  );
}
