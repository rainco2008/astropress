import type { APIRoute } from "astro";
import { queryPosts } from "@astropress/core/query";
import { eq, inArray, and } from "drizzle-orm";
import { wpOptions, wpPostmeta } from "@astropress/core/schema";

function esc(s: unknown) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const DEFAULT_TEMPLATE_BLOCKS: Record<string, any[]> = {
  "default-with-image": [
    { type: "loop-image", props: { height: 220 } },
    { type: "loop-category", props: { size: "10px" } },
    { type: "loop-title", props: { tag: "h3", size: "1.05rem", weight: "700" } },
    { type: "loop-date", props: { size: "11px" } },
    { type: "loop-excerpt", props: { length: 120, size: "0.9rem" } },
    { type: "loop-read-more", props: { text: "Read More \u2192", buttonStyle: "link" } },
  ],
  "default-no-image": [
    { type: "loop-category", props: { size: "10px", badge: true } },
    { type: "loop-title", props: { tag: "h3", size: "1.1rem", weight: "700" } },
    { type: "loop-date", props: { size: "11px" } },
    { type: "loop-author", props: { prefix: "By " } },
    { type: "loop-excerpt", props: { length: 160, size: "0.9rem" } },
    { type: "loop-read-more", props: { text: "Read More \u2192", buttonStyle: "link" } },
  ],
  "default-horizontal": [
    { type: "loop-image", props: { height: 140, layout: "horizontal", width: "180px" } },
    { type: "loop-category", props: { size: "10px" } },
    { type: "loop-title", props: { tag: "h3", size: "1rem", weight: "700" } },
    { type: "loop-date", props: { size: "11px" } },
    { type: "loop-excerpt", props: { length: 80, size: "0.88rem" } },
    { type: "loop-read-more", props: { text: "Read More \u2192", buttonStyle: "link" } },
  ],
  "default-magazine": [
    { type: "loop-image", props: { height: 280 } },
    { type: "loop-category", props: { size: "10px", badge: true } },
    { type: "loop-title", props: { tag: "h3", size: "1.15rem", weight: "700" } },
    { type: "loop-date", props: { size: "11px" } },
    { type: "loop-read-more", props: { text: "Read More \u2192", buttonStyle: "link" } },
  ],
};

function renderLoopBlock(block: any, post: any, meta: Record<string, string> = {}): string {
  const p = block.props ?? {};
  const postUrl = post.type === "page" ? `/${post.slug}` : `/blog/${post.slug}`;
  const date = post.date ? new Date(post.date) : new Date();
  const PRIMARY = "#2271b1";
  const MUTED = "#6c757d";

  switch (block.type) {
    case "loop-image":
      return `<a href="${esc(postUrl)}" style="display:block;height:${Number(p.height)||220}px;overflow:hidden;background:#f0f4f8;flex-shrink:0;"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div></a>`;
    case "loop-category":
      return `<div style="padding:0 16px 6px;"><span style="font-size:${String(p.size||"10px")};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${String(p.color||PRIMARY)};${p.badge ? `background:#f0f4f8;border:1px solid #e2e8f0;border-radius:99px;padding:2px 8px;` : ""}">${esc(post.type||"Post")}</span></div>`;
    case "loop-title": {
      const tag = String(p.tag||"h3");
      return `<${tag} style="margin:0;padding:6px 16px;font-weight:${String(p.weight||"700")};font-size:${String(p.size||"1.05rem")};line-height:1.35;color:${String(p.color||"#212529")};"><a href="${esc(postUrl)}" style="color:inherit;text-decoration:none;">${esc(post.title)}</${tag}>`;
    }
    case "loop-date": {
      let dateStr = "";
      const fmt = String(p.format||"long");
      try { dateStr = fmt === "long" ? date.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" }) : fmt === "iso" ? date.toISOString().slice(0,10) : date.toLocaleDateString(); } catch {}
      return `<div style="padding:4px 16px;"><span style="font-size:${String(p.size||"11px")};color:${String(p.color||MUTED)};">${esc(dateStr)}</span></div>`;
    }
    case "loop-author":
      return `<div style="padding:4px 16px;"><span style="font-size:${String(p.size||"11px")};color:${String(p.color||MUTED)};">${esc(String(p.prefix||"By "))}Author</span></div>`;
    case "loop-excerpt": {
      const raw = post.excerpt || String(post.content||"").replace(/<[^>]+>/g, "");
      const len = Number(p.length)||120;
      const ex = raw.length > len ? raw.slice(0, len) + "\u2026" : raw;
      return ex ? `<div style="padding:4px 16px;"><p style="margin:0;font-size:${String(p.size||"0.9rem")};color:${String(p.color||MUTED)};line-height:1.65;">${esc(ex)}</p></div>` : "";
    }
    case "loop-read-more": {
      const bStyle = String(p.buttonStyle||"link");
      const bText = String(p.text||"Read More \u2192");
      const bColor = String(p.color||PRIMARY);
      if (bStyle === "button") return `<div style="padding:10px 16px 16px;"><a href="${esc(postUrl)}" style="display:inline-block;background:${bColor};color:#fff;padding:8px 20px;border-radius:6px;font-size:${String(p.size||"13px")};font-weight:600;text-decoration:none;">${esc(bText)}</a></div>`;
      if (bStyle === "outline") return `<div style="padding:10px 16px 16px;"><a href="${esc(postUrl)}" style="display:inline-block;border:2px solid ${bColor};color:${bColor};padding:7px 18px;border-radius:6px;font-size:${String(p.size||"13px")};font-weight:600;text-decoration:none;">${esc(bText)}</a></div>`;
      return `<div style="padding:10px 16px 16px;"><a href="${esc(postUrl)}" style="font-size:${String(p.size||"13px")};font-weight:600;color:${bColor};text-decoration:none;">${esc(bText)}</a></div>`;
    }
    case "loop-custom-field": {
      const fieldKey = String(p.fieldKey || "");
      if (!fieldKey) return "";
      const val = meta[fieldKey] ?? String(p.fallback || "");
      if (!val) return "";
      const labelHtml = p.showLabel !== false && p.label
        ? `<span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${String(p.labelColor||MUTED)};margin-bottom:2px;">${esc(String(p.label))}</span>`
        : "";
      return `<div style="padding:4px 16px;">${labelHtml}<span style="font-size:${String(p.size||"13px")};color:${String(p.color||"#212529")};">${esc(val)}</span></div>`;
    }
    case "spacer": return `<div style="height:${Number(p.height)||16}px;"></div>`;
    case "divider": return `<hr style="border:none;border-top:1px solid #e9ecef;margin:8px 16px;">`;
    case "html": return `<div style="padding:0 16px;">${String(p.content||"")}</div>`;
    default: return "";
  }
}

function renderCard(post: any, templateBlocks: any[], cardBg: string, cardBorder: string, cardRadius: string, meta: Record<string, string> = {}): string {
  const isHorizontal = templateBlocks.some((b: any) => b.type === "loop-image" && b.props?.layout === "horizontal");

  if (isHorizontal) {
    const imgBlocks = templateBlocks.filter(b => b.type === "loop-image");
    const restBlocks = templateBlocks.filter(b => b.type !== "loop-image");
    const imgWidth = String(imgBlocks[0]?.props?.width || "180px");
    return `<article style="background:${cardBg};border:1px solid ${cardBorder};border-radius:${cardRadius};overflow:hidden;display:flex;flex-direction:row;">
      <div style="width:${imgWidth};flex-shrink:0;">${imgBlocks.map(b => renderLoopBlock(b, post, meta)).join("")}</div>
      <div style="flex:1;display:flex;flex-direction:column;">${restBlocks.map(b => renderLoopBlock(b, post, meta)).join("")}</div>
    </article>`;
  }

  return `<article style="background:${cardBg};border:1px solid ${cardBorder};border-radius:${cardRadius};overflow:hidden;display:flex;flex-direction:column;">
    ${templateBlocks.map(b => renderLoopBlock(b, post, meta)).join("")}
  </article>`;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const db = locals.db;
  if (!db) return new Response(JSON.stringify({ error: "No DB" }), { status: 503, headers: { "Content-Type": "application/json" } });

  const postType = url.searchParams.get("postType") || "post";
  const page = Number(url.searchParams.get("page") || "2");
  const perPage = Number(url.searchParams.get("perPage") || "6");
  const orderBy = (url.searchParams.get("orderBy") || "date") as any;
  const orderRaw = (url.searchParams.get("order") || "desc").toLowerCase();
  const order = (orderRaw === "asc" ? "asc" : "desc") as "asc" | "desc";
  const templateId = url.searchParams.get("templateId") || "default-with-image";
  const cardBg = url.searchParams.get("cardBg") || "#ffffff";
  const cardBorder = url.searchParams.get("cardBorder") || "#e2e8f0";
  const cardRadius = url.searchParams.get("cardRadius") || "8px";

  let templateBlocks: any[] = DEFAULT_TEMPLATE_BLOCKS[templateId] ?? DEFAULT_TEMPLATE_BLOCKS["default-with-image"];

  if (!templateId.startsWith("default-")) {
    const schemaKey = `astropress_page_schema___loop-item_${templateId}__`;
    try {
      const [srow] = await (db as any).select({ value: wpOptions.optionValue }).from(wpOptions)
        .where(eq(wpOptions.optionName, schemaKey)).limit(1);
      if (srow?.value) templateBlocks = JSON.parse(srow.value).blocks ?? [];
    } catch {}
  }

  const { posts, total } = await queryPosts(db, { type: postType, perPage, page, orderBy, order });
  const totalPages = Math.ceil(total / perPage);

  // Map query.ts Post shape
  const mappedPosts = posts.map((p: any) => ({
    id: p.id ?? p.ID ?? 0,
    title: p.title ?? "",
    slug: p.slug ?? "",
    type: p.type ?? "post",
    excerpt: p.excerpt ?? "",
    content: p.content ?? "",
    date: p.date ?? "",
  }));

  // Batch-fetch custom field meta if any loop-custom-field blocks are in template
  const customFieldKeys = templateBlocks
    .filter((b: any) => b.type === "loop-custom-field" && b.props?.fieldKey)
    .map((b: any) => String(b.props.fieldKey));
  const postMetaMap: Record<number, Record<string, string>> = {};
  if (customFieldKeys.length > 0) {
    const postIds = mappedPosts.map(p => p.id).filter(Boolean);
    if (postIds.length > 0) {
      try {
        const metaRows = await (db as any).select({
          postId: wpPostmeta.postId,
          metaKey: wpPostmeta.metaKey,
          metaValue: wpPostmeta.metaValue,
        }).from(wpPostmeta).where(
          and(inArray(wpPostmeta.postId, postIds), inArray(wpPostmeta.metaKey, customFieldKeys))
        );
        for (const row of metaRows) {
          if (!postMetaMap[row.postId]) postMetaMap[row.postId] = {};
          postMetaMap[row.postId][row.metaKey] = row.metaValue ?? "";
        }
      } catch {}
    }
  }

  const html = mappedPosts.map(post => renderCard(post, templateBlocks, cardBg, cardBorder, cardRadius, postMetaMap[post.id] ?? {})).join("");

  return new Response(JSON.stringify({ html, hasMore: page < totalPages, page, total }), {
    headers: { "Content-Type": "application/json" },
  });
};
