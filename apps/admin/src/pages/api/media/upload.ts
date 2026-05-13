import type { APIRoute } from "astro";
import { wpPosts, wpPostmeta } from "@astropress/core/schema";

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  const db = locals.db;
  if (!user || !db) return new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${Date.now()}-${originalName}`;
  const buffer = await file.arrayBuffer();

  // Use R2 on Cloudflare, local filesystem in dev
  const r2 = (locals as any).runtime?.env?.R2 as R2Bucket | undefined;
  if (r2) {
    await r2.put(key, buffer, { httpMetadata: { contentType: file.type } });
  } else {
    // Local dev: write to public/media
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const uploadDir = join(process.cwd(), "public", "media");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, key), new Uint8Array(buffer));
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const siteUrl = import.meta.env.SITE_URL ?? "http://localhost:4321";

  const [{ id }] = await (db as any).insert(wpPosts).values({
    postTitle: originalName.replace(/\.[^.]+$/, ""),
    postContent: "",
    postExcerpt: "",
    postStatus: "inherit",
    postType: "attachment",
    postMimeType: file.type,
    postName: key,
    postAuthor: user.id,
    postDate: now,
    postDateGmt: now,
    postModified: now,
    postModifiedGmt: now,
    guid: r2 ? `/media/${key}` : `/media/${key}`,
  }).returning({ id: wpPosts.id });

  await (db as any).insert(wpPostmeta).values({
    postId: id,
    metaKey: "_wp_attached_file",
    metaValue: key,
  });

  return new Response(
    JSON.stringify({ id, url: `/media/${key}`, filename: key }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
};
