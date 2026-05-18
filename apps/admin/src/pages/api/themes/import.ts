import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { wpOptions, wpPosts } from "@astropress/core/schema";
import type { ThemePackage, TemplateSlots } from "@astropress/core/types/theme";

function uid() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); }

async function upsertOption(db: any, name: string, value: string, autoload = "yes") {
  const existing = await db.select({ id: wpOptions.optionId }).from(wpOptions).where(eq(wpOptions.optionName, name)).limit(1);
  if (existing.length > 0) {
    await db.update(wpOptions).set({ optionValue: value }).where(eq(wpOptions.optionName, name));
  } else {
    await db.insert(wpOptions).values({ optionName: name, optionValue: value, autoload });
  }
}

export const POST: APIRoute = async ({ locals, request }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });

  let pkg: ThemePackage;
  try {
    const body = await request.json() as any;
    pkg = body.package ?? body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (!pkg?.name || !pkg?.tokens) {
    return new Response(JSON.stringify({ error: "Invalid theme package — missing name or tokens" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const now = new Date().toISOString();
  const slots: TemplateSlots = {};

  // 1. Load existing templates list
  const [tmplRow] = await db.select({ value: wpOptions.optionValue }).from(wpOptions).where(eq(wpOptions.optionName, "astropress_theme_templates")).limit(1);
  const templates: any[] = tmplRow?.value ? JSON.parse(tmplRow.value) : [];

  // 2. Create each template from the package
  for (const tmplDef of pkg.templates ?? []) {
    const id = uid();
    const schemaSlug = `__${tmplDef.type}_${id}__`;
    const template = {
      id,
      name: tmplDef.name || tmplDef.type,
      type: tmplDef.type,
      conditions: [{ rule: "entire_site" }],
      schemaSlug,
      createdAt: now,
      updatedAt: now,
    };
    templates.push(template);

    // Seed blocks (assign fresh IDs)
    const blocks = (tmplDef.blocks ?? []).map((b: any) => ({ ...b, id: uid() }));
    await upsertOption(db, `astropress_page_schema_${schemaSlug}`, JSON.stringify({ version: 1, blocks }), "no");

    // Set as active slot for this type
    (slots as any)[tmplDef.type] = schemaSlug;
  }

  await upsertOption(db, "astropress_theme_templates", JSON.stringify(templates));
  await upsertOption(db, "astropress_template_slots", JSON.stringify(slots));

  // 3. Apply tokens
  await upsertOption(db, "astropress_theme_config", JSON.stringify(pkg.tokens));

  // Update active theme tokens too
  const [activeRow] = await db.select({ value: wpOptions.optionValue }).from(wpOptions).where(eq(wpOptions.optionName, "astropress_active_theme")).limit(1);
  const [themesRow] = await db.select({ value: wpOptions.optionValue }).from(wpOptions).where(eq(wpOptions.optionName, "astropress_themes")).limit(1);
  if (activeRow?.value && themesRow?.value) {
    const themesList: any[] = JSON.parse(themesRow.value);
    const idx = themesList.findIndex(t => t.id === activeRow.value);
    if (idx !== -1) {
      themesList[idx] = { ...themesList[idx], tokens: pkg.tokens, updatedAt: now };
      await upsertOption(db, "astropress_themes", JSON.stringify(themesList));
    }
  }

  // 4. Create pages (as published wp_posts + page schemas)
  const createdPages: string[] = [];
  for (const pageDef of pkg.pages ?? []) {
    const slug = pageDef.slug.replace(/^\//, "");
    if (!slug) continue;

    // Check if page with this slug exists
    const existing = await db.select({ id: wpPosts.id }).from(wpPosts)
      .where(eq(wpPosts.postName, slug)).limit(1);

    let postId: number;
    if (existing.length > 0) {
      postId = existing[0].id;
      // Update existing page
      await db.update(wpPosts).set({ postTitle: pageDef.title, postStatus: "publish", updatedAt: now })
        .where(eq(wpPosts.postName, slug));
    } else {
      // Insert new page
      const result = await db.insert(wpPosts).values({
        postTitle: pageDef.title,
        postName: slug,
        postStatus: "publish",
        postType: "page",
        postContent: "",
        postExcerpt: "",
        postAuthor: locals.user.id,
        postDate: now,
        postDateGmt: now,
        postModified: now,
        postModifiedGmt: now,
        commentStatus: "closed",
        pingStatus: "closed",
        postParent: 0,
        menuOrder: 0,
        postMimeType: "",
        guid: `/${slug}`,
        commentCount: 0,
        toPing: "",
        pinged: "",
        postContentFiltered: "",
        postPassword: "",
      }).returning({ id: wpPosts.id });
      postId = result[0]?.id;
    }

    if (postId) {
      const blocks = (pageDef.blocks ?? []).map((b: any) => ({ ...b, id: uid() }));
      await upsertOption(db, `astropress_page_schema_${slug}`, JSON.stringify({ version: 1, blocks }), "no");
      createdPages.push(slug);
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    slotsSet: Object.keys(slots),
    templatesCreated: (pkg.templates ?? []).length,
    pagesCreated: createdPages,
  }), { headers: { "Content-Type": "application/json" } });
};
