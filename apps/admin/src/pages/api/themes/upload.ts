import type { APIRoute } from "astro";
import { unzipSync } from "fflate";

export const POST: APIRoute = async ({ locals, request }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });

  let pkg: any;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (name.endsWith(".zip")) {
      const files = unzipSync(bytes);
      // Look for theme.json or the first .json file
      const jsonKey = Object.keys(files).find(k => k.endsWith("theme.json")) ?? Object.keys(files).find(k => k.endsWith(".json"));
      if (!jsonKey) {
        return new Response(JSON.stringify({ error: "No JSON file found inside the zip" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const text = new TextDecoder().decode(files[jsonKey]);
      pkg = JSON.parse(text);
    } else if (name.endsWith(".json")) {
      const text = new TextDecoder().decode(bytes);
      pkg = JSON.parse(text);
    } else {
      return new Response(JSON.stringify({ error: "Only .zip and .json files are supported" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Failed to parse file: " + String(e?.message ?? e) }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (!pkg?.tokens) {
    return new Response(JSON.stringify({ error: "Invalid theme file — missing tokens" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Return a preview summary without importing
  return new Response(JSON.stringify({
    ok: true,
    preview: {
      name: pkg.name || "Unnamed Theme",
      description: pkg.description || "",
      author: pkg.author || "",
      version: pkg.version || "",
      tokens: pkg.tokens,
      templateCount: (pkg.templates ?? []).length,
      pageCount: (pkg.pages ?? []).length,
      pages: (pkg.pages ?? []).map((p: any) => ({ slug: p.slug, title: p.title })),
      templates: (pkg.templates ?? []).map((t: any) => ({ type: t.type, name: t.name })),
    },
    package: pkg,
  }), { headers: { "Content-Type": "application/json" } });
};
