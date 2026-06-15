import type { APIRoute } from "astro";

// Serves media files from R2 on Cloudflare, or redirects to the static
// public/media/ directory on local dev (Astro serves it as a static asset).
export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key as string;
  if (!key) return new Response("Not found", { status: 404 });

  const r2 = (locals as any).runtime?.env?.R2 as R2Bucket | undefined;

  if (r2) {
    const obj = await r2.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(obj.body as BodyInit, { headers });
  }

  // Local dev: static files live in public/media/ — serve via Node fs
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const filePath = join(process.cwd(), "public", "media", key);
    const buffer = await readFile(filePath);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const mime: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
      pdf: "application/pdf", mp4: "video/mp4", mp3: "audio/mpeg",
    };
    return new Response(buffer, {
      headers: { "content-type": mime[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};
