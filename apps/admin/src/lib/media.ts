import { eq, desc, count } from "drizzle-orm";
import type { Database } from "@astropress/core";
import { wpPosts, wpPostmeta } from "@astropress/core/schema";

export interface MediaItem {
  id: number;
  title: string;
  filename: string;
  mimeType: string;
  url: string;
  date: string;
}

export async function listMedia(
  db: Database,
  opts: { page?: number; perPage?: number; search?: string } = {}
): Promise<{ items: MediaItem[]; total: number }> {
  const { page = 1, perPage = 40, search } = opts;
  const offset = (page - 1) * perPage;

  const { and, like } = await import("drizzle-orm");

  const where = search
    ? and(eq(wpPosts.postType, "attachment"), like(wpPosts.postTitle, `%${search}%`))
    : eq(wpPosts.postType, "attachment");

  const [{ total }] = await db
    .select({ total: count() })
    .from(wpPosts)
    .where(where);

  const rows = await db
    .select()
    .from(wpPosts)
    .where(where)
    .orderBy(desc(wpPosts.postDate))
    .limit(perPage)
    .offset(offset);

  // Fetch URLs from postmeta
  const ids = rows.map((r: any) => r.id);
  let metaMap: Record<number, string> = {};

  if (ids.length > 0) {
    const metas = await db
      .select()
      .from(wpPostmeta)
      .where(eq(wpPostmeta.metaKey, "_wp_attached_file"));

    for (const m of metas) {
      if (ids.includes(m.postId)) {
        metaMap[m.postId] = m.metaValue ?? "";
      }
    }
  }

  // Media files are served from the admin app's public/media directory.
  // Use MEDIA_BASE_URL env if set (e.g. R2 public URL in production),
  // otherwise fall back to the admin server URL.
  const siteUrl = (import.meta.env.MEDIA_BASE_URL ?? import.meta.env.SITE_URL ?? "http://localhost:4321").replace(/\/$/, "");

  return {
    items: rows.map((r: any) => ({
      id: r.id,
      title: r.postTitle,
      filename: metaMap[r.id] ?? "",
      mimeType: r.postMimeType,
      url: `${siteUrl}/media/${metaMap[r.id] ?? ""}`,
      date: r.postDate,
    })),
    total,
  };
}
