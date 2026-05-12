import { useState, useEffect, useCallback } from "react";

interface Entry {
  id: string;
  formId: string;
  fields: Record<string, any>;
  date: string;
  ip: string;
  userAgent: string;
  status: "unread" | "read" | "starred" | "spam" | "trash";
  pageUrl: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
}

interface Form {
  id: string;
  name?: string;
  title?: string;
  fields: FormField[];
}

const STATUS_LABELS: Record<string, string> = {
  all: "All Entries",
  unread: "Unread",
  read: "Read",
  starred: "Starred",
  spam: "Spam",
  trash: "Trash",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function EntryDetail({ entry, fields, onClose, onStatus }: {
  entry: Entry;
  fields: FormField[];
  onClose: () => void;
  onStatus: (id: string, status: string) => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, width: 640, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #dcdcde", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Entry #{entry.id}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#646970" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["unread", "read", "starred", "spam", "trash"].map(s => (
              <button
                key={s}
                onClick={() => onStatus(entry.id, s)}
                style={{
                  padding: "4px 12px", borderRadius: 4, border: "1px solid #dcdcde", cursor: "pointer", fontSize: 12,
                  background: entry.status === s ? "#2271b1" : "#fff",
                  color: entry.status === s ? "#fff" : "#3c434a"
                }}
              >
                {STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {fields.filter(f => !["page_break","section_divider","html","captcha"].includes(f.type)).map(f => (
                <tr key={f.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 0", fontWeight: 600, width: 180, verticalAlign: "top", color: "#3c434a" }}>{f.label}</td>
                  <td style={{ padding: "10px 0 10px 16px", color: "#1d2327", wordBreak: "break-word" }}>
                    {renderFieldValue(entry.fields[f.id], f.type)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 0", fontWeight: 600, color: "#3c434a" }}>Submitted</td>
                <td style={{ padding: "10px 0 10px 16px" }}>{formatDate(entry.date)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 0", fontWeight: 600, color: "#3c434a" }}>IP Address</td>
                <td style={{ padding: "10px 0 10px 16px" }}>{entry.ip}</td>
              </tr>
              {entry.pageUrl && (
                <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 0", fontWeight: 600, color: "#3c434a" }}>Page URL</td>
                  <td style={{ padding: "10px 0 10px 16px" }}><a href={entry.pageUrl} target="_blank" rel="noopener" style={{ color: "#2271b1" }}>{entry.pageUrl}</a></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderFieldValue(val: any, type: string): string {
  if (val === undefined || val === null || val === "") return "—";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default function FormEntries({ formId }: { formId: string }) {
  const [form, setForm] = useState<Form | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Entry | null>(null);
  const [search, setSearch] = useState("");
  const [exportMsg, setExportMsg] = useState("");

  const perPage = 20;

  const loadForm = useCallback(async () => {
    const r = await fetch(`/api/forms/${formId}`);
    if (r.ok) setForm(await r.json());
  }, [formId]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/forms/${formId}/entries?status=${status}&page=${page}`);
    if (r.ok) {
      const data = await r.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [formId, status, page]);

  useEffect(() => { loadForm(); }, [loadForm]);
  useEffect(() => { loadEntries(); setSelected(new Set()); }, [loadEntries]);

  const updateStatus = async (entryId: string, newStatus: string) => {
    await fetch(`/api/forms/${formId}/entries`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, status: newStatus }),
    });
    if (detail?.id === entryId) setDetail(prev => prev ? { ...prev, status: newStatus as any } : null);
    await loadEntries();
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/forms/${formId}/entries`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, action: "delete" }),
    });
    setDetail(null);
    await loadEntries();
  };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (action === "delete") {
      if (!confirm(`Delete ${ids.length} entries?`)) return;
      await fetch(`/api/forms/${formId}/entries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: ids, action: "bulk_delete" }),
      });
    } else {
      await fetch(`/api/forms/${formId}/entries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: ids, action: "bulk_status", status: action }),
      });
    }
    setSelected(new Set());
    await loadEntries();
  };

  const exportCSV = () => {
    if (!form || entries.length === 0) return;
    const cols = (form.fields ?? []).filter(f => !["page_break","section_divider","html","captcha"].includes(f.type));
    const rows = [
      ["Entry ID", "Date", "IP", ...cols.map(c => c.label)],
      ...entries.map(e => [
        e.id, e.date, e.ip,
        ...cols.map(c => {
          const v = e.fields[c.id];
          if (v === undefined || v === null) return "";
          if (Array.isArray(v)) return v.join("; ");
          if (typeof v === "object") return JSON.stringify(v);
          return String(v).replace(/"/g, '""');
        })
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `form-${formId}-entries.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg("Exported!");
    setTimeout(() => setExportMsg(""), 2000);
  };

  const filtered = search
    ? entries.filter(e => JSON.stringify(e.fields).toLowerCase().includes(search.toLowerCase()))
    : entries;

  const totalPages = Math.ceil(total / perPage);
  const allChecked = filtered.length > 0 && filtered.every(e => selected.has(e.id));

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map(e => e.id)));
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13 }}>
      {detail && form && (
        <EntryDetail
          entry={detail}
          fields={form.fields ?? []}
          onClose={() => setDetail(null)}
          onStatus={(id, s) => updateStatus(id, s)}
        />
      )}

      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {form?.title ?? form?.name ?? "Form"} — Entries
          <span style={{ fontSize: 13, fontWeight: 400, color: "#646970", marginLeft: 8 }}>({total})</span>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={{ padding: "6px 14px", background: "#fff", border: "1px solid #dcdcde", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
            {exportMsg || "Export CSV"}
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #dcdcde", marginBottom: 16 }}>
        {Object.entries(STATUS_LABELS).map(([s, label]) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            style={{
              padding: "8px 16px", background: "none", border: "none", borderBottom: status === s ? "2px solid #2271b1" : "2px solid transparent",
              cursor: "pointer", fontSize: 13, color: status === s ? "#2271b1" : "#646970", fontWeight: status === s ? 600 : 400
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + Bulk */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #dcdcde", borderRadius: 4, width: 220, fontSize: 13 }}
        />
        {selected.size > 0 && (
          <>
            <select onChange={e => { if (e.target.value) bulkAction(e.target.value); e.target.value = ""; }}
              style={{ padding: "6px 10px", border: "1px solid #dcdcde", borderRadius: 4, fontSize: 13 }}>
              <option value="">Bulk Actions ({selected.size})</option>
              <option value="read">Mark as Read</option>
              <option value="unread">Mark as Unread</option>
              <option value="starred">Mark as Starred</option>
              <option value="spam">Mark as Spam</option>
              <option value="trash">Move to Trash</option>
              <option value="delete">Delete Permanently</option>
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#646970" }}>Loading entries…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#646970", background: "#fff", borderRadius: 8, border: "1px solid #dcdcde" }}>
          No entries found.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #dcdcde", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f6f7f7" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", width: 32 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#3c434a" }}>Entry</th>
                {(form?.fields ?? [])
                  .filter(f => !["page_break","section_divider","html","captcha"].includes(f.type))
                  .slice(0, 3)
                  .map(f => (
                    <th key={f.id} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#3c434a" }}>{f.label}</th>
                  ))}
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#3c434a" }}>Date</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#3c434a" }}>Status</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#3c434a" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(entry.id)}
                      onChange={e => {
                        const s = new Set(selected);
                        e.target.checked ? s.add(entry.id) : s.delete(entry.id);
                        setSelected(s);
                      }}
                    />
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: entry.status === "unread" ? 700 : 400 }}>
                    <button
                      onClick={() => setDetail(entry)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#2271b1", fontSize: 13, padding: 0 }}
                    >
                      #{entry.id.slice(0, 8)}
                    </button>
                  </td>
                  {(form?.fields ?? [])
                    .filter(f => !["page_break","section_divider","html","captcha"].includes(f.type))
                    .slice(0, 3)
                    .map(f => (
                      <td key={f.id} style={{ padding: "10px 14px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {renderFieldValue(entry.fields[f.id], f.type)}
                      </td>
                    ))}
                  <td style={{ padding: "10px 14px", color: "#646970", whiteSpace: "nowrap" }}>{formatDate(entry.date)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: entry.status === "unread" ? "#dbeafe" : entry.status === "starred" ? "#fef9c3" : entry.status === "spam" ? "#fce7f3" : entry.status === "trash" ? "#fee2e2" : "#f0f0f0",
                      color: entry.status === "unread" ? "#1e40af" : entry.status === "starred" ? "#854d0e" : entry.status === "spam" ? "#9d174d" : entry.status === "trash" ? "#991b1b" : "#646970",
                    }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setDetail(entry)} style={{ padding: "3px 8px", border: "1px solid #dcdcde", background: "#fff", borderRadius: 3, cursor: "pointer", fontSize: 12 }}>View</button>
                      {entry.status !== "read" && (
                        <button onClick={() => updateStatus(entry.id, "read")} style={{ padding: "3px 8px", border: "1px solid #dcdcde", background: "#fff", borderRadius: 3, cursor: "pointer", fontSize: 12 }}>Read</button>
                      )}
                      <button onClick={() => deleteEntry(entry.id)} style={{ padding: "3px 8px", border: "1px solid #dc3232", background: "#fff", borderRadius: 3, cursor: "pointer", fontSize: 12, color: "#dc3232" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: "flex", gap: 4, alignItems: "center" }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ padding: "5px 12px", border: "1px solid #dcdcde", background: "#fff", borderRadius: 4, cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.5 : 1, fontSize: 13 }}
          >
            ‹ Prev
          </button>
          <span style={{ padding: "0 12px", fontSize: 13, color: "#646970" }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ padding: "5px 12px", border: "1px solid #dcdcde", background: "#fff", borderRadius: 4, cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.5 : 1, fontSize: 13 }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
