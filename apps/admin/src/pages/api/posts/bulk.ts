import type { APIRoute } from "astro";
import { inArray } from "drizzle-orm";
import { wpPosts } from "@astropress/core/schema";

const ALLOWED_ACTIONS = new Set(["trash", "restore", "delete", "publish", "draft"]);

export const POST: APIRoute = async ({ locals, request }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });

  let body: { action: string; ids: number[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { action, ids } = body;
  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: "action and ids required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!ALLOWED_ACTIONS.has(action)) {
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const numIds = ids.map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (numIds.length === 0) {
    return new Response(JSON.stringify({ error: "No valid IDs" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  if (action === "trash") {
    await db.update(wpPosts).set({ postStatus: "trash", postModified: now, postModifiedGmt: now }).where(inArray(wpPosts.id, numIds));
  } else if (action === "restore") {
    await db.update(wpPosts).set({ postStatus: "draft", postModified: now, postModifiedGmt: now }).where(inArray(wpPosts.id, numIds));
  } else if (action === "delete") {
    await db.delete(wpPosts).where(inArray(wpPosts.id, numIds));
  } else if (action === "publish") {
    await db.update(wpPosts).set({ postStatus: "publish", postModified: now, postModifiedGmt: now }).where(inArray(wpPosts.id, numIds));
  } else if (action === "draft") {
    await db.update(wpPosts).set({ postStatus: "draft", postModified: now, postModifiedGmt: now }).where(inArray(wpPosts.id, numIds));
  }

  return new Response(JSON.stringify({ ok: true, count: numIds.length }), { headers: { "Content-Type": "application/json" } });
};
