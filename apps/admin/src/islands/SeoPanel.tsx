import React, { useState, useEffect, useCallback } from "react";

interface Props {
  postId: number;
}

interface SeoMeta {
  _yoast_wpseo_title: string;
  _yoast_wpseo_metadesc: string;
  _yoast_wpseo_focuskw: string;
}

const FIELD_LABELS: Record<keyof SeoMeta, string> = {
  _yoast_wpseo_title: "SEO Title",
  _yoast_wpseo_metadesc: "Meta Description",
  _yoast_wpseo_focuskw: "Focus Keyword",
};

const FIELD_HINTS: Record<keyof SeoMeta, string> = {
  _yoast_wpseo_title: "Overrides the page title in search results. ~60 chars.",
  _yoast_wpseo_metadesc: "Short summary shown in search results. ~155 chars.",
  _yoast_wpseo_focuskw: "The main keyword or phrase this content targets.",
};

function charCount(val: string, limit: number) {
  const len = val.length;
  const color = len === 0 ? "#a7aaad" : len <= limit ? "#146c43" : "#d63638";
  return (
    <span style={{ fontSize: 10, color, float: "right" }}>
      {len}/{limit}
    </span>
  );
}

export default function SeoPanel({ postId }: Props) {
  const [meta, setMeta] = useState<SeoMeta>({
    _yoast_wpseo_title: "",
    _yoast_wpseo_metadesc: "",
    _yoast_wpseo_focuskw: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/meta`)
      .then((r) => r.json())
      .then((data) => {
        const d = data as Record<string, string>;
        setMeta({
          _yoast_wpseo_title: d._yoast_wpseo_title ?? "",
          _yoast_wpseo_metadesc: d._yoast_wpseo_metadesc ?? "",
          _yoast_wpseo_focuskw: d._yoast_wpseo_focuskw ?? "",
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [postId]);

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/posts/${postId}/meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      setStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  }, [postId, meta]);

  if (!loaded) {
    return (
      <div style={{ padding: 14, fontSize: 12, color: "#646970" }}>Loading…</div>
    );
  }

  return (
    <div>
      {(["_yoast_wpseo_title", "_yoast_wpseo_metadesc", "_yoast_wpseo_focuskw"] as (keyof SeoMeta)[]).map((key) => {
        const isTextarea = key === "_yoast_wpseo_metadesc";
        const limit = key === "_yoast_wpseo_title" ? 60 : key === "_yoast_wpseo_metadesc" ? 155 : 50;

        return (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>
              {FIELD_LABELS[key]}
              {charCount(meta[key], limit)}
            </label>
            {isTextarea ? (
              <textarea
                value={meta[key]}
                rows={3}
                onChange={(e) => setMeta((prev) => ({ ...prev, [key]: e.target.value }))}
                style={{
                  width: "100%", fontSize: 12, padding: "6px 8px",
                  border: "1px solid #dcdcde", borderRadius: 3, resize: "vertical",
                  outline: "none", fontFamily: "inherit",
                }}
              />
            ) : (
              <input
                type="text"
                value={meta[key]}
                onChange={(e) => setMeta((prev) => ({ ...prev, [key]: e.target.value }))}
                style={{
                  width: "100%", fontSize: 12, padding: "6px 8px",
                  border: "1px solid #dcdcde", borderRadius: 3, outline: "none",
                }}
              />
            )}
            <p style={{ fontSize: 10, color: "#646970", margin: "3px 0 0" }}>
              {FIELD_HINTS[key]}
            </p>
          </div>
        );
      })}

      <button
        onClick={save}
        disabled={status === "saving"}
        style={{
          width: "100%", padding: "7px", fontSize: 12, fontWeight: 600,
          background: status === "saved" ? "#146c43" : status === "error" ? "#d63638" : "#2271b1",
          color: "#fff", border: "none", borderRadius: 3, cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : status === "error" ? "Error — retry" : "Save SEO"}
      </button>
    </div>
  );
}
