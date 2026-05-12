import type { APIRoute } from "astro";
import { eq, and } from "drizzle-orm";
import { wpPostmeta } from "@astropress/core/schema";

export const GET: APIRoute = async ({ params, locals }) => {
  const db = locals.db;
  if (!db) return new Response("No DB", { status: 503 });

  const postId = Number(params.id);
  const rows = await db
    .select({ key: wpPostmeta.metaKey, value: wpPostmeta.metaValue })
    .from(wpPostmeta)
    .where(eq(wpPostmeta.postId, postId));

  const meta = Object.fromEntries(rows.map((r) => [r.key ?? "", r.value ?? ""]));
  return new Response(JSON.stringify(meta), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });

  const postId = Number(params.id);
  const body = await request.json() as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    // Check if meta key exists
    const [existing] = await db
      .select({ metaId: wpPostmeta.metaId })
      .from(wpPostmeta)
      .where(and(eq(wpPostmeta.postId, postId), eq(wpPostmeta.metaKey, key)))
      .limit(1);

    if (existing) {
      await db
        .update(wpPostmeta)
        .set({ metaValue: value })
        .where(eq(wpPostmeta.metaId, existing.metaId));
    } else {
      await db.insert(wpPostmeta).values({ postId, metaKey: key, metaValue: value });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
