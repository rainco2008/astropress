# Architecture

## Overview

AstroPress is a **pnpm workspace + Turborepo monorepo** containing two Astro SSR applications that share a single SQLite database through a common `@astropress/core` package.

```
Browser
  │
  ├─→ apps/admin (port 4321)   ─┐
  │     Astro SSR + React islands│
  │                              ├── local.db / Cloudflare D1
  └─→ apps/web (port 4322)    ─┘
        Astro SSR only
```

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Monorepo | pnpm workspaces + Turborepo | Shared packages, smart caching |
| Framework | Astro 4 (SSR) | Islands architecture, zero JS by default |
| Database | SQLite via libsql / Cloudflare D1 | Same API in dev and production |
| ORM | Drizzle ORM | Type-safe, SQLite-native, no magic |
| Schema | WordPress `wp_*` tables | Battle-tested data model, familiar |
| Auth | Lucia v3 (`@astropress/auth`) | Lightweight sessions, no magic |
| Editor | `@wordpress/block-editor` | Gutenberg without WordPress |
| Deployment | Cloudflare Pages + D1 + R2 | Edge-global, generous free tier |

---

## Monorepo packages

### `packages/core`

The shared foundation. Everything else depends on it.

| Export | Purpose |
|--------|---------|
| `@astropress/core` | Registry functions, plugin loader, types |
| `@astropress/core/schema` | Drizzle table definitions |
| `@astropress/core/query` | WP-style data helpers (queryPosts, getField …) |
| `@astropress/core/db` | `createLocalDb` / `createDb` factories |
| `@astropress/core/registry` | `registerPostType`, `getPostTypes` … |

### `packages/auth`

Lucia v3 session auth wrapper. Exports `createAuth(db)` which returns a Lucia instance configured for SQLite sessions.

### `packages/api`

Hono router foundation — not yet wired in as the main handler, used for internal RPC patterns.

### `packages/ui`

Shared React component library (early stage).

---

## apps/admin

The CMS dashboard — all admin UI, all REST API routes.

### Request lifecycle

```
HTTP request
  → Astro middleware (apps/admin/src/middleware.ts)
      1. Connect to DB (singleton, re-used across requests)
      2. Load custom post types / taxonomies / field groups from wp_options into registry
      3. Bootstrap plugins (once per process)
      4. Check setup completion (redirect to /setup if not done)
      5. Validate session cookie → Astro.locals.user
  → Page/API route handler
```

### Key directories

```
apps/admin/src/
├── middleware.ts          Request lifecycle (DB, auth, plugins, public paths)
├── plugins.ts             Plugin bootstrap — import and loadPlugin() here
├── env.d.ts               Type augmentation for Astro.locals
├── layouts/
│   └── AdminLayout.astro  Sidebar, topbar, slot
├── lib/
│   ├── icons.ts           SVG icon pack (adminIcons, getIcon, ICON_NAMES)
│   ├── posts.ts           Post CRUD helpers used by API routes
│   ├── media.ts           Media upload helpers
│   └── slugify.ts         Shared slug generator
├── islands/               React islands (client:only="react")
│   ├── BlockEditor.tsx    Gutenberg editor + astropress/form block
│   ├── FormBuilder.tsx    Form builder UI
│   ├── FormEntries.tsx    Form entries management
│   ├── FormRenderer.tsx   Form preview renderer
│   ├── FieldGroupEditor.tsx  ACF-style field group UI
│   ├── CustomFieldsPanel.tsx Post editor sidebar panel
│   └── SeoPanel.tsx       SEO sidebar panel
└── pages/
    ├── admin/             All admin UI pages
    └── api/               REST API endpoints
```

### React islands

Interactive components are Astro islands loaded with `client:only="react"`. They:
- Receive props from the server (post ID, form ID, etc.)
- Fetch their own data via `fetch()` to the API routes
- Never render on the server (browser globals in `@wordpress/*` packages)

---

## apps/web

The public front-end — renders published content for visitors.

### Request lifecycle

```
HTTP request
  → Astro middleware (apps/web/src/middleware.ts)
      Connect to DB
  → Page handler
      Query posts/pages from DB
      Server-render content (form blocks replaced inline)
      Return HTML
```

### Form block rendering

When a post contains an `astropress/form` Gutenberg block, the saved HTML is:
```html
<div class="wp-block-astropress-form" data-form-id="abc123"></div>
```

The page handler in `[slug].astro` detects these, loads form configs from the DB, and replaces them with full HTML via `buildFormHtml()` before sending the response. No JavaScript required for basic form display.

---

## Database schema

AstroPress uses a WordPress-compatible schema. Key tables:

| Table | Purpose |
|-------|---------|
| `wp_posts` | Posts, pages, nav_menu_items, attachments |
| `wp_postmeta` | Post meta / custom field values |
| `wp_options` | Site options, forms, field groups, custom types |
| `wp_terms` | Categories, tags, nav menu names |
| `wp_term_taxonomy` | Associates terms with taxonomies |
| `wp_term_relationships` | Links posts to terms |
| `wp_users` | Admin users |
| `wp_usermeta` | User meta |
| `wp_sessions` | Lucia v3 sessions |

### Custom data storage in `wp_options`

AstroPress stores its own config as JSON blobs in `wp_options`:

| Option key | Contents |
|-----------|---------|
| `astropress_setup_complete` | `"1"` after setup |
| `astropress_custom_post_types` | JSON array of custom post type configs |
| `astropress_custom_taxonomies` | JSON array of custom taxonomy configs |
| `astropress_field_groups` | JSON array of ACF-style field group configs |
| `astropress_forms` | JSON array of form configs |
| `astropress_form_entries_{formId}` | JSON array of form entries per form |

---

## Authentication

Session-based auth via Lucia v3:

1. Login POST → `bcrypt` hash check → `auth.createSession()` → session cookie set
2. Every subsequent request → middleware reads cookie → `auth.validateSession()` → `Astro.locals.user`
3. Logout POST → `auth.invalidateSession()` → blank cookie set

Sessions stored in `wp_sessions` table. No JWT, no magic.

**Public paths** (no auth required):
- `/login`, `/setup`, `/api/auth/*`, `/api/setup`
- `/forms/*` (form preview pages)
- `/api/forms/submit` (form submissions from public site)
- `GET /api/forms/:id` (form config fetch for public renderer)

---

## Plugin system

Plugins run entirely server-side at startup. They register post types, taxonomies, and sidebar panels into the in-memory registry.

```
plugins/my-plugin/src/index.ts
  └── definePlugin({ register() { ... } })
          ↓ loadPlugin() in apps/admin/src/plugins.ts
          ↓ bootstrapPlugins() called in middleware on first request
          ↓ plugin.register() runs → registerPostType(), etc.
          ↓ post types appear in sidebar + editor
```

See [plugin-api.md](./plugin-api.md) for full details.

---

## Icon system

All admin icons are flat inline SVGs from `apps/admin/src/lib/icons.ts`.
The `adminIcons` record maps name → SVG string.
Post types store their icon as a name string (e.g. `"book"`), not an emoji.

See [icons.md](./icons.md) for the full icon reference.
