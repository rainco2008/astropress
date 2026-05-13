/**
 * Built-in AI Actions
 *
 * Import this file once (in the execute API route and chat route) to register
 * all built-in actions. Plugins call registerAIAction() to add their own.
 */

import { eq } from "drizzle-orm";
import { wpOptions } from "@astropress/core/schema";
import { registerPostType } from "@astropress/core/registry";
import { registerAIAction } from "./ai-registry";
import { createPost, updatePost, deletePost } from "./posts";
import { slugify } from "./slugify";

// ─── Posts ────────────────────────────────────────────────────────────────────

registerAIAction({
  type: "createPost",
  description: "Create a new post, page, or custom post type entry with full content",
  example: '{"type":"createPost","postType":"post","title":"My Title","content":"<p>HTML content</p>","excerpt":"Short description","status":"draft"}',
  serverSide: true,
  handler: async (params, db, userId) => {
    const postType = params.postType ?? "post";
    const id = await createPost(db, {
      title: params.title ?? "Untitled",
      content: params.content ?? "",
      excerpt: params.excerpt ?? "",
      status: params.status ?? "draft",
      type: postType,
      authorId: userId,
    });

    const section =
      postType === "page" ? "pages"
      : postType === "post" ? "posts"
      : `cpt/${postType}`;

    return {
      success: true,
      message: `Created "${params.title}" as ${params.status ?? "draft"}`,
      navigate: `/admin/${section}/${id}`,
      data: { id },
    };
  },
});

registerAIAction({
  type: "updatePost",
  description: "Update an existing post's title, content, excerpt, or status by ID",
  example: '{"type":"updatePost","id":42,"title":"New Title","content":"<p>New content</p>","status":"publish"}',
  serverSide: true,
  handler: async (params, db) => {
    if (!params.id) return { success: false, message: "Missing post id" };
    await updatePost(db, Number(params.id), {
      title: params.title,
      content: params.content,
      excerpt: params.excerpt,
      status: params.status,
    });
    return { success: true, message: `Updated post #${params.id}` };
  },
});

registerAIAction({
  type: "trashPost",
  description: "Move a post to trash by ID",
  example: '{"type":"trashPost","id":42}',
  serverSide: true,
  handler: async (params, db) => {
    if (!params.id) return { success: false, message: "Missing post id" };
    await deletePost(db, Number(params.id));
    return { success: true, message: `Moved post #${params.id} to trash` };
  },
});

// ─── Settings ─────────────────────────────────────────────────────────────────

const WRITABLE_SETTINGS = new Set([
  "blogname",
  "blogdescription",
  "siteurl",
  "admin_email",
  "posts_per_page",
]);

registerAIAction({
  type: "updateSettings",
  description: "Update site settings. Writable keys: blogname, blogdescription, siteurl, admin_email, posts_per_page",
  example: '{"type":"updateSettings","settings":{"blogname":"My Site","blogdescription":"A great site"}}',
  serverSide: true,
  handler: async (params, db) => {
    const settings: Record<string, string> = params.settings ?? {};
    const updated: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      if (!WRITABLE_SETTINGS.has(key)) continue;
      await db
        .insert(wpOptions)
        .values({ optionName: key, optionValue: String(value) })
        .onConflictDoUpdate({
          target: wpOptions.optionName,
          set: { optionValue: String(value) },
        });
      updated.push(key);
    }

    if (!updated.length) return { success: false, message: "No valid settings keys provided" };
    return {
      success: true,
      message: `Updated settings: ${updated.join(", ")}`,
      navigate: "/admin/settings",
    };
  },
});

// ─── Forms ────────────────────────────────────────────────────────────────────

registerAIAction({
  type: "createForm",
  description: "Create a contact/inquiry form with specified fields",
  example: '{"type":"createForm","name":"Contact Us","fields":[{"label":"Name","type":"text","required":true},{"label":"Email","type":"email","required":true},{"label":"Message","type":"textarea","required":true}]}',
  serverSide: true,
  handler: async (params, db) => {
    const row = await db
      .select()
      .from(wpOptions)
      .where(eq(wpOptions.optionName, "astropress_forms"))
      .get();

    const forms: any[] = row?.optionValue ? JSON.parse(row.optionValue) : [];
    const id = `form_${Date.now()}`;
    const newForm = {
      id,
      name: params.name ?? "New Form",
      title: params.name ?? "New Form",
      fields: (params.fields ?? []).map((f: any, i: number) => ({
        id: `field_${i + 1}`,
        type: f.type ?? "text",
        label: f.label ?? `Field ${i + 1}`,
        required: f.required ?? false,
        placeholder: f.placeholder ?? "",
        options: f.options ?? [],
      })),
      createdAt: new Date().toISOString(),
    };
    forms.push(newForm);

    await db
      .insert(wpOptions)
      .values({ optionName: "astropress_forms", optionValue: JSON.stringify(forms) })
      .onConflictDoUpdate({
        target: wpOptions.optionName,
        set: { optionValue: JSON.stringify(forms) },
      });

    return {
      success: true,
      message: `Created form "${newForm.name}"`,
      navigate: `/admin/forms/${id}`,
      data: { id },
    };
  },
});

// ─── Post Types ───────────────────────────────────────────────────────────────

registerAIAction({
  type: "createPostType",
  description: "Register a custom post type (e.g. products, events, testimonials)",
  example: '{"type":"createPostType","name":"Products","key":"product","singular":"Product","description":"Store product listings","icon":"tag"}',
  serverSide: true,
  handler: async (params, db) => {
    if (!params.key || !/^[a-z0-9_]+$/.test(params.key)) {
      return { success: false, message: "key must be lowercase alphanumeric with underscores" };
    }

    const row = await db
      .select()
      .from(wpOptions)
      .where(eq(wpOptions.optionName, "astropress_custom_post_types"))
      .get();

    const existing: any[] = row?.optionValue ? JSON.parse(row.optionValue) : [];

    if (existing.find((pt: any) => pt.key === params.key)) {
      return { success: false, message: `Post type "${params.key}" already exists` };
    }

    const newType = {
      key: params.key,
      config: {
        name: params.name ?? params.key,
        singular: params.singular ?? params.name ?? params.key,
        description: params.description ?? "",
        icon: params.icon ?? "folder",
        public: true,
        showInMenu: true,
        supports: ["title", "editor", "excerpt"],
      },
    };
    existing.push(newType);

    await db
      .insert(wpOptions)
      .values({ optionName: "astropress_custom_post_types", optionValue: JSON.stringify(existing) })
      .onConflictDoUpdate({
        target: wpOptions.optionName,
        set: { optionValue: JSON.stringify(existing) },
      });

    try {
      registerPostType(newType.key, newType.config);
    } catch {}

    return {
      success: true,
      message: `Created post type "${newType.config.name}"`,
      navigate: `/admin/cpt/${params.key}`,
      data: { key: params.key },
    };
  },
});

// ─── Client-side actions (DOM — documented for system prompt only) ─────────────

registerAIAction({
  type: "setTitle",
  description: "Set the post/page title in the current editor",
  example: '{"type":"setTitle","value":"My Post Title"}',
  serverSide: false,
});

registerAIAction({
  type: "setContent",
  description: "Set the block editor content on the current editor page",
  example: '{"type":"setContent","html":"<h2>Heading</h2><p>Paragraph text</p>"}',
  serverSide: false,
});

registerAIAction({
  type: "setExcerpt",
  description: "Set the excerpt/meta description on the current editor page",
  example: '{"type":"setExcerpt","value":"A short description of this post."}',
  serverSide: false,
});

registerAIAction({
  type: "setStatus",
  description: "Change the publish status on the current editor page",
  example: '{"type":"setStatus","value":"publish"}',
  serverSide: false,
});

registerAIAction({
  type: "savePost",
  description: "Save/publish the current post in the editor",
  example: '{"type":"savePost","status":"publish"}',
  serverSide: false,
});

registerAIAction({
  type: "navigate",
  description: "Navigate the browser to any admin URL",
  example: '{"type":"navigate","url":"/admin/posts"}',
  serverSide: false,
});
