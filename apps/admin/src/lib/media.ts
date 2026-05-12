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
  opts: { page?: number; perPage?: number } = {}
): Promise<{ items: MediaItem[]; total: number }> {
  const { page = 1, perPage = 40 } = opts;
  const offset = (page - 1) * perPage;

  const [{ total }] = await db
    .select({ total: count() })
    .from(wpPosts)
    .where(eq(wpPosts.postType, "attachment"));

  const rows = await db
    .select()
    .from(wpPosts)
    .where(eq(wpPosts.postType, "attachment"))
    .orderBy(desc(wpPosts.postDate))
    .limit(perPage)
    .offset(offset);

  // Fetch URLs from postmeta
  const ids = rows.map((r) => r.id);
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

  const siteUrl = process.env.SITE_URL ?? "";

  return {
    items: rows.map((r) => ({
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
