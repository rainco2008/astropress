# CLAUDE.md — AstroPress

Instructions for Claude Code when working on this project.

---

## Project Overview

AstroPress is a pnpm + Turborepo monorepo. Two Astro SSR apps share a single SQLite database via `@astropress/core`.

| App | Port | Role |
|-----|------|------|
| `apps/admin` | 4321 | CMS dashboard — all admin UI, REST API routes |
| `apps/web` | 4322 | Public front-end — renders published content |

Shared packages live in `packages/core` (schema, registry, query helpers, types).

---

## Key Files

```
packages/core/src/
  schema/         wp_posts, wp_postmeta, wp_options, wp_terms, wp_users
  registry/       post type & taxonomy in-memory registry
  query.ts        queryPosts, getField, getTerms, getSiteInfo … (WP-style helpers)
  db.ts           createLocalDb (libsql) / createDb (D1)

apps/admin/src/
  middleware.ts          DB setup, auth, custom type loading from DB, public path list
  plugins.ts             Plugin bootstrap — add new plugins here
  layouts/AdminLayout.astro
  lib/icons.ts           Shared SVG icon pack (adminIcons, getIcon, ICON_NAMES)
  islands/               React islands loaded with client:only="react"
    BlockEditor.tsx       Gutenberg editor + custom form block
    FormBuilder.tsx       WPForms-style form builder
    FormEntries.tsx       Form entries table
    FormRenderer.tsx      Public form renderer (preview)
    FieldGroupEditor.tsx  ACF-style field group editor
  pages/admin/           All admin UI pages
  pages/api/             REST API endpoints (follow Astro APIRoute pattern)

apps/web/src/
  lib/query.ts           Re-exports from @astropress/core/query + getNavMenu
  lib/formRenderer.ts    buildFormHtml(), APF_STYLES, APF_SCRIPT
  pages/[slug].astro     Page renderer — detects + renders form blocks server-side
  pages/blog/[slug].astro
```

---

## Database

- **Local dev:** SQLite file at `./local.db`, accessed via `@libsql/client`
- **Production:** Cloudflare D1 (same SQLite-compatible API)
- **Schema:** WordPress `wp_*` tables — never rename columns
- **ORM:** Drizzle ORM — always import table definitions from `@astropress/core/schema`
- **Access in pages:** `const db = Astro.locals.db;` — never create a new DB connection in pages
- **Access in API routes:** `const db = locals.db;`

---

## Auth

- Session-based via Lucia v3 (`@astropress/auth`)
- Middleware handles all auth — pages don't need to re-check unless they redirect to `/login` as a safety net
- `Astro.locals.user` contains `{ id, userLogin, userEmail, displayName }` on authenticated routes
- Public paths are whitelisted in `apps/admin/src/middleware.ts` — add new public routes there

---

## Query Helpers

Always use `@astropress/core/query` instead of raw Drizzle in `.astro` pages:

```astro
---
import { queryPosts, getField, getPostTerms } from "@astropress/core/query";
const db = Astro.locals.db;
const { posts } = await queryPosts(db, { type: "book", perPage: 12 });
const price = await getField(db, post.id, "price");
---
```

Use raw Drizzle only in API routes that need complex joins or writes.

---

## Icon Pack

All SVG icons come from `apps/admin/src/lib/icons.ts`. Never define inline SVGs in templates.

```astro
---
import { adminIcons, getIcon } from "../lib/icons";
---
<Fragment set:html={adminIcons.dashboard} />
<Fragment set:html={getIcon(postType.config.icon ?? "folder")} />
```

Post type `icon` field stores the **icon name** (e.g. `"book"`) not an emoji. When adding new post type icons, add them to `lib/icons.ts` first.

---

## React Islands

- All interactive React components live in `apps/admin/src/islands/`
- Loaded with `client:only="react"` — they receive no server-rendered HTML
- Keep islands focused: data fetching via `fetch()` inside the island to the API routes
- Never import heavy WordPress packages outside of islands — they break SSR

---

## Custom Post Types & Taxonomies

- Built-in types registered in `packages/core/src/registry/index.ts`
- Custom types stored as JSON in `wp_options` key `astropress_custom_post_types`
- Loaded into the in-memory registry by middleware on first request
- API routes for CRUD: `apps/admin/src/pages/api/post-types/`

---

## Forms

- Form configs stored as JSON in `wp_options` key `astropress_forms`
- Entries stored in `wp_options` key `astropress_form_entries`
- Form blocks in Gutenberg save as: `<div class="wp-block-astropress-form" data-form-id="ID"></div>`
- Web app renders forms server-side in `[slug].astro` and `blog/[slug].astro` via `buildFormHtml()`

---

## Menus

- Nav menus stored in `wp_terms` / `wp_term_taxonomy` (taxonomy = `nav_menu`)
- Menu items are `nav_menu_item` posts linked via `wp_term_relationships`
- Item URLs in `wp_postmeta` with key `_menu_item_url`
- Web app reads menus with `getNavMenu(db, "primary")` — convention: slug `primary` = main nav

---

## Coding Conventions

- **No emojis in admin UI** — use icons from `lib/icons.ts`
- **No inline SVGs in templates** — always use the icon pack
- **Post type `icon` = icon name string**, not emoji
- **Auth redirects go to `/login`** — not `/admin/login`
- **API routes return JSON** with `Content-Type: application/json`
- **Migrations first** — schema changes need a Drizzle migration before code changes
- **No `any` in `packages/core`** — keep the core fully typed
- **Astro pages are server-only** — use `client:only="react"` for interactive islands

---

## Dev Commands

```bash
# From monorepo root
pnpm dev              # start both apps in parallel
pnpm build            # build all
pnpm typecheck        # type-check all packages and apps

# From apps/admin or apps/web
pnpm dev              # start just that app

# Database
pnpm db:setup         # run migrations on local.db
pnpm db:seed          # seed demo content

# Kill port and restart
lsof -ti :4321 | xargs kill -9 && pnpm dev
```

---

## Adding a New Admin Page

1. Create `apps/admin/src/pages/admin/my-section/index.astro`
2. Add auth guard at top of frontmatter:
   ```ts
   if (!Astro.locals.user || !db) return Astro.redirect("/login");
   ```
3. Wrap content in `<AdminLayout title="My Section">`
4. Add a sidebar link in `apps/admin/src/layouts/AdminLayout.astro`

## Adding a New API Route

```ts
// apps/admin/src/pages/api/my-thing/index.ts
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });
  // ...
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
};
```

## Adding a Plugin

1. Create package in `plugins/my-plugin/`
2. Export a `definePlugin({...})` config with a `register()` function
3. Import and call `loadPlugin(myPlugin)` in `apps/admin/src/plugins.ts`
