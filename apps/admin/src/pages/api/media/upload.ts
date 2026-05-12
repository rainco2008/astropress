import type { APIRoute } from "astro";
import { wpPosts, wpPostmeta } from "@astropress/core/schema";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

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
  const uploadDir = join(process.cwd(), "public", "media");
  const filePath = join(uploadDir, key);

  // Save to local filesystem
  await mkdir(uploadDir, { recursive: true });
  const buffer = await file.arrayBuffer();
  await writeFile(filePath, new Uint8Array(buffer));

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
    guid: `/media/${key}`,
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
