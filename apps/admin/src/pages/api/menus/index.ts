import type { APIRoute } from "astro";
import { wpTerms, wpTermTaxonomy } from "@astropress/core/schema";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });

  const { name } = await request.json() as { name: string };
  if (!name?.trim()) return new Response("Name required", { status: 400 });

  const slug = slugify(name);

  const [{ termId }] = await db
    .insert(wpTerms)
    .values({ name, slug, termGroup: 0 })
    .returning({ termId: wpTerms.termId });

  await db.insert(wpTermTaxonomy).values({
    termId,
    taxonomy: "nav_menu",
    description: "",
    parent: 0,
    count: 0,
  });

  return new Response(JSON.stringify({ id: termId, slug }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
