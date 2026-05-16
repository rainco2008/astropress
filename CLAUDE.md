# CLAUDE.md — AstroPress

Instructions for Claude Code when working on this project.

---

## Project Overview

AstroPress is a WordPress-compatible CMS built with Astro 4 SSR + Drizzle ORM + SQLite/Cloudflare D1.
It runs as a **pnpm + Turborepo monorepo** with two apps sharing one database via `@astropress/core`.

| App | Port | Role |
|-----|------|------|
| `apps/admin` | 4321 | CMS dashboard — all admin UI, REST API routes |
| `apps/web` | 4322 | Public front-end — renders published content |

Shared packages: `packages/core` (schema, registry, query helpers, types, db drivers).

---

## Key Files

```
packages/core/src/
  schema/index.ts     wp_posts, wp_postmeta, wp_options, wp_terms, wp_users (Drizzle tables)
  registry/index.ts   in-memory post type, taxonomy, sidebar panel, field group registries
  registry/types.ts   PostTypeConfig, TaxonomyConfig, SidebarPanelConfig, FieldGroup types
  types/theme.ts      Block, BlockType, PageSchema, Theme, ThemeTokens
  query.ts            queryPosts, getField, getTerms, getSiteInfo … (WP-style helpers)
  plugins/loader.ts   definePlugin, loadPlugin, getLoadedPlugins
  db/index.ts         createDatabase (LibSQL/D1/PostgreSQL auto-detect)

apps/admin/src/
  middleware.ts              DB setup, auth, custom type loading from DB, public path list
  plugins.ts                 Plugin bootstrap — add new plugins here
  layouts/AdminLayout.astro  Sidebar nav, top bar, WP CSS variables
  lib/icons.ts               SVG icon pack (adminIcons, getIcon, ICON_NAMES)
  lib/posts.ts               listPosts, getPost, createPost, updatePost, deletePost
  lib/siteUrl.ts             getSiteUrl(db) — reads siteurl from wp_options
  islands/                   React islands (client:only="react")
    BlockEditor.tsx           Gutenberg-style block editor
    FormBuilder.tsx           WPForms-style form builder
    FormEntries.tsx           Form submission entries table
    FormRenderer.tsx          Public form preview renderer
    FieldGroupEditor.tsx      ACF-style field group builder
    CustomFieldsPanel.tsx     Post sidebar custom field values
    TaxonomyPanel.tsx         Post sidebar taxonomy selector
    SeoPanel.tsx              SEO metadata sidebar panel
    AIWidget.tsx              Floating AI chat assistant
    AISettings.tsx            AI provider config (Anthropic/OpenAI/Gemini/etc.)
    ThemeEditor.tsx           Visual block-based page editor (full-screen)
  pages/admin/               All admin UI pages (see Admin Pages section)
  pages/api/                 REST API endpoints

apps/web/src/
  middleware.ts              DB init (no auth)
  lib/query.ts               Re-exports from @astropress/core/query + getNavMenu
  lib/formRenderer.ts        buildFormHtml(), APF_STYLES, APF_SCRIPT
  components/BlockRenderer.astro  Renders visual page block schemas
  layouts/BaseLayout.astro   Public site header, nav, footer
  pages/[slug].astro         Page renderer (checks for block schema first)
  pages/blog/[slug].astro    Blog post renderer
  pages/forms/[id].astro     Standalone public form page
```

---

## Admin Pages Map

```
/admin/dashboard
/admin/posts/          — list, new, [id]
/admin/pages/          — list, new, [id] (always opens visual editor; ?classic=1 for classic)
/admin/cpt/[type]/     — list, new, [id] (?editor=visual for visual editor)
/admin/forms/          — list, create, [id], [id]/entries
/admin/custom-fields/  — list, new, [id]
/admin/post-types/     — list (built-in + custom)
/admin/taxonomies/     — list
/admin/menus/          — list, [id]
/admin/medias/         — media library
/admin/users/          — list, [id]
/admin/themes/         — gallery + "Add New" + "Create Blank"
/admin/themes/add      — tabs: Upload | Browse (marketplace) | Spec
/admin/themes/customize/[id]   — edit theme tokens (colors, fonts, spacing)
/admin/themes/tokens   — global theme token editor
/admin/themes/edit/[slug]      — visual block editor (full-screen ThemeEditor island)
/admin/plugins/        — installed plugins (code + light)
/admin/plugins/add     — tabs: Upload | Browse (marketplace) | Spec
/admin/settings/       — general site settings
/admin/settings/ai     — AI provider config
```

---

## API Routes Map

```
POST   /api/auth/login          POST /api/auth/logout
GET    /api/posts               POST /api/posts
GET    /api/posts/[id]          PUT /api/posts/[id]       DELETE /api/posts/[id]
GET    /api/posts/[id]/meta     PUT /api/posts/[id]/meta
GET    /api/posts/[id]/terms/[taxonomy]  PUT /api/posts/[id]/terms/[taxonomy]
GET    /api/themes              POST /api/themes
PUT    /api/themes/[id]         POST /api/themes/[id] (activate)  DELETE /api/themes/[id]
POST   /api/themes/upload       — install theme from .zip or .json
GET    /api/themes/config
POST   /api/plugins/upload      — install light plugin from .zip or .json
PUT    /api/plugins/[name]      — activate/deactivate light plugin
DELETE /api/plugins/[name]      — remove light plugin
GET    /api/forms               POST /api/forms
GET    /api/forms/[id]          PUT /api/forms/[id]       DELETE /api/forms/[id]
POST   /api/forms/submit        — public, no auth required
GET    /api/forms/[id]/entries  DELETE /api/forms/[id]/entries/[entryId]
GET    /api/custom-fields       POST /api/custom-fields
PUT    /api/custom-fields/[id]  DELETE /api/custom-fields/[id]
GET    /api/custom-fields/values
GET    /api/post-types          POST /api/post-types      DELETE /api/post-types/[key]
GET    /api/taxonomies          POST /api/taxonomies      DELETE /api/taxonomies/[key]
GET    /api/terms/[taxonomy]
GET    /api/menus               POST /api/menus
PUT    /api/menus/[id]          DELETE /api/menus/[id]
GET    /api/menus/[id]/items    POST /api/menus/[id]/items
PUT    /api/menus/[id]/items/[itemId]  DELETE /api/menus/[id]/items/[itemId]
GET    /api/media               POST /api/media/upload
GET    /api/users/[id]          PUT /api/users/[id]
GET    /api/page-schema/[slug]  PUT /api/page-schema/[slug]
POST   /api/ai/chat             — AI chat (context-aware)
POST   /api/ai/generate-blocks  — generate page blocks from prompt
POST   /api/ai/execute          — run server-side AI actions
GET    /api/ai/settings         PUT /api/ai/settings
POST   /api/setup
```

---

## Database

- **Local dev:** SQLite file at `./local.db` via `@libsql/client`
- **Production:** Cloudflare D1 (same SQLite API), auto-detected in middleware
- **Also supports:** PostgreSQL (Neon, Supabase) — detected by URL prefix `postgres://`
- **Schema:** WordPress `wp_*` tables — never rename columns
- **ORM:** Drizzle ORM — always import table definitions from `@astropress/core/schema`
- **Pages:** `const db = Astro.locals.db;` — never create a new DB connection in pages
- **API routes:** `const db = locals.db;`

### wp_options Storage Keys

| Key | Contents |
|-----|----------|
| `astropress_custom_post_types` | JSON array of custom post type configs |
| `astropress_custom_taxonomies` | JSON array of custom taxonomy configs |
| `astropress_field_groups` | JSON array of ACF-style field group definitions |
| `astropress_forms` | JSON array of form configs |
| `astropress_form_entries` | JSON array of form submission entries |
| `astropress_themes` | JSON array of Theme objects |
| `astropress_active_theme` | ID of active theme |
| `astropress_theme_config` | Active theme's ThemeTokens (synced on activate) |
| `astropress_page_schema_<slug>` | Visual block schema for a page/post |
| `astropress_page_schema___header__` | Header template block schema |
| `astropress_page_schema___footer__` | Footer template block schema |
| `astropress_ai_settings` | AI provider config (provider, model, apiKey, systemContext) |
| `astropress_light_plugins` | JSON array of uploaded light plugin manifests |
| `astropress_setup_complete` | "1" if initial setup done |
| `siteurl` | Frontend site URL (used by admin to build preview links) |
| `blogname` | Site title |

---

## Auth

- Session-based via Lucia v3 (`@astropress/auth`)
- Middleware validates sessions and sets `Astro.locals.user = { id, userLogin, userEmail, displayName }`
- All routes require auth; public routes whitelisted in `apps/admin/src/middleware.ts`
- Auth redirect: always `/login` (not `/admin/login`)
- **Public paths:** `/login`, `/api/auth/login`, `/setup`, `/api/setup`, `/forms/*`, `/api/forms/submit`, `GET /api/forms/<id>`

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

Key helpers: `queryPosts`, `getPost`, `getPostById`, `getPostBySlug`, `getChildren`, `getAncestors`,
`getField`, `getFields`, `updatePostMeta`, `getTerms`, `getPostTerms`, `getOption`, `updateOption`, `getSiteInfo`, `getAuthor`

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

Post type `icon` field stores the **icon name string** (e.g. `"book"`), not an emoji.
When adding new post type icons, add them to `lib/icons.ts` first.

---

## Theme System

### Theme Object
```typescript
interface Theme {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  tokens: ThemeTokens;
  source?: "upload" | "marketplace" | undefined;
  createdAt: string;
  updatedAt: string;
}
```

### ThemeTokens
```typescript
interface ThemeTokens {
  colors: { primary, secondary, background, surface, text, textMuted, border };
  fonts: { heading, body };           // CSS font-family strings
  spacing: { sectionY, containerMax, borderRadius };
}
```

### Visual Editor (ThemeEditor.tsx)
- Blocks: `hero`, `text`, `image`, `columns`, `cta`, `features`, `form`, `nav`, `site-title`, `spacer`, `divider`, `html`, `ai`
- Block schemas stored in `wp_options` as `astropress_page_schema_<slug>`
- Header/Footer templates: `astropress_page_schema___header__` / `___footer__`
- Pages default to visual editor; classic via `?classic=1`
- CPT posts: toggle via `?editor=classic` vs `?editor=visual` tabs

### Theme Upload Spec (.zip format)
```
my-theme.zip/
└── theme.json    { name, version, description, author, authorUrl, tokens{} }
```
API: `POST /api/themes/upload` (accepts FormData with `file` or `json`)

---

## Plugin System

### Code Plugins (npm packages)
```typescript
// plugins/my-plugin/src/index.ts
export default definePlugin({
  name: "my-plugin", version: "1.0.0",
  register() {
    registerSidebarPanel("my-panel", { id, title, postTypes, componentId });
  }
});
// Then: loadPlugin(myPlugin) in apps/admin/src/plugins.ts
```

### Light Plugins (upload .zip — no server rebuild needed)
JSON-only: define post types, taxonomies, sidebar panels (built-in component IDs only).
```
my-plugin.zip/
└── plugin.json   { name, version, type:"light", postTypes[], taxonomies[], panels[] }
```
Stored in `wp_options` key `astropress_light_plugins`.
API: `POST /api/plugins/upload`, `PUT/DELETE /api/plugins/[name]`

### Plugin Registration Points
- `registerPostType(slug, config)` — add custom post type
- `registerTaxonomy(slug, config)` — add custom taxonomy
- `registerSidebarPanel(id, config)` — add panel to post editor sidebar
- `registerFieldGroup(group)` — add custom field group
- `registerAIAction(action)` — extend AI assistant capabilities

---

## Forms

- Form configs stored as JSON in `wp_options` key `astropress_forms`
- Entries stored in `wp_options` key `astropress_form_entries`
- Form blocks in Gutenberg classic editor: `<div class="wp-block-astropress-form" data-form-id="ID"></div>`
- Web app renders forms server-side via `buildFormHtml()` in `apps/web/src/lib/formRenderer.ts`
- Public submission: `POST /api/forms/submit` (no auth, whitelisted in middleware)
- Form preview: standalone page at `/forms/[id]`

---

## AI System

- **Chat:** `POST /api/ai/chat` — builds context-aware prompt from page context + system instructions
- **Generate blocks:** `POST /api/ai/generate-blocks` — returns `Block[]` from a prompt
  - Prefers structured blocks (hero, features, cta, columns, form) over raw HTML
  - Auto-creates contact/newsletter forms if needed; patches `formId` in block props
  - Supports `singleBlock: true` for the AI Block in the visual editor
- **Execute:** `POST /api/ai/execute` — runs registered server-side AI actions
- **Settings:** `astropress_ai_settings` stores `{ activeProvider, providers, systemContext }`
  - `systemContext` is a site-wide system prompt injected into all AI operations
- **AI Block** in ThemeEditor — generate any block type from description; uses `onReplace` callback

---

## Menus

- Nav menus stored in `wp_terms` / `wp_term_taxonomy` (taxonomy = `nav_menu`)
- Menu items are `nav_menu_item` posts linked via `wp_term_relationships`
- Item URLs in `wp_postmeta` with key `_menu_item_url`
- Web app reads menus with `getNavMenu(db, "primary")` — slug `primary` = main nav

---

## Frontend URL Handling

Admin always uses `siteUrl` (from `wp_options` key `siteurl`) for all "View" and "Preview" links.
This ensures decoupled deployments (admin on port 4321, web on different URL/port) work correctly.

```typescript
// lib/siteUrl.ts
import { getSiteUrl } from "../../../../lib/siteUrl";
const siteUrl = await getSiteUrl(db);
// Template: href={`${siteUrl}/${post.slug}`}
// Inline script: var siteUrl = root.dataset.siteUrl || "";
```

Files using getSiteUrl: `posts/[id].astro`, `pages/[id].astro`, `pages/index.astro`,
`cpt/[type]/[id].astro`, `themes/edit/[slug].astro`, `ThemeEditor.tsx` (as prop).

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
- **No iframe** for embedding content — render server-side
- **siteUrl for all frontend links** — never use relative paths like `/${slug}` in admin pages
- **Terse responses** — no trailing summaries, lead with action

---

## Dev Commands

```bash
# From monorepo root
pnpm dev              # start both apps in parallel (ports 4321, 4322)
pnpm build            # build all
pnpm typecheck        # type-check all packages and apps

# From apps/admin or apps/web
pnpm dev              # start just that app

# Database
pnpm db:setup         # run migrations on local.db
pnpm db:seed          # seed demo content

# Kill ports and restart
lsof -ti :4321 | xargs kill -9
lsof -ti :4322 | xargs kill -9
pnpm dev
```

---

## Adding a New Admin Page

1. Create `apps/admin/src/pages/admin/my-section/index.astro`
2. Add auth guard at top of frontmatter:
   ```ts
   const db = Astro.locals.db;
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
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
};
```

## Adding a Code Plugin

1. Create package in `plugins/my-plugin/` with `package.json` + `src/index.ts`
2. Export `definePlugin({...})` with a `register()` function
3. Import and call `loadPlugin(myPlugin)` in `apps/admin/src/plugins.ts`

## Adding a Light Plugin (upload-only)

Create a `plugin.json` with `{ name, version, type:"light", postTypes[], taxonomies[], panels[] }`
and zip it. Install via `/admin/plugins/add` → Upload Plugin.
