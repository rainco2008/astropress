# AstroPress — MVP Plan
> A fully open-source, WordPress-compatible CMS built on Astro, deployable in one click to Cloudflare.

---

## Vision

AstroPress is a modern CMS that speaks WordPress (same database schema, same mental model) but runs on the edge. No PHP, no legacy baggage — just TypeScript, Astro, and Cloudflare's infrastructure. Developers get the extensibility of WordPress; users get a fast, cheap, easy-to-deploy system.

**North Star:** A developer should be able to spin up a full CMS — admin, front-end, database, storage — with a single `pnpm deploy` command.

---

## What the MVP Must Do

- [ ] Admin panel with login (session-based auth)
- [ ] Create / edit / publish Posts and Pages (with Gutenberg block editor)
- [ ] Media library backed by Cloudflare R2
- [ ] Basic taxonomy support (Categories + Tags)
- [ ] Public front-end that renders published content
- [ ] One-click deploy to Cloudflare (D1 + R2 + Pages)
- [ ] Plugin registration API (foundation only, no marketplace yet)

**Out of scope for MVP:** Multisite, WooCommerce compat, theme marketplace, comments, user roles beyond Admin.

---

## Monorepo Structure

```
astropress/
├── apps/
│   ├── admin/          # Astro SSR — the CMS dashboard
│   └── web/            # Astro SSG/SSR — the public front-end
├── packages/
│   ├── core/           # Drizzle schema, Registry, shared types
│   ├── auth/           # Session-based auth (Lucia)
│   ├── api/            # Hono router — REST + internal RPC
│   └── ui/             # Shared component library (React islands)
├── plugins/            # First-party plugins live here
│   └── seo/            # Example: SEO plugin (MVP placeholder)
├── themes/             # First-party themes
│   └── default/        # Minimal default theme for apps/web
├── pnpm-workspace.yaml
├── turbo.json
└── wrangler.toml       # Cloudflare deployment config
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Monorepo | pnpm + Turborepo | Fast installs, smart caching |
| Framework | Astro 4 (SSR + SSG) | Islands, adapters, zero JS by default |
| Database ORM | Drizzle ORM | Type-safe, SQLite/D1 native |
| Schema | WordPress `wp_*` tables | Familiar, battle-tested data model |
| Auth | Lucia v3 | Lightweight, adapter-based, no magic |
| API Layer | Hono | Tiny, edge-native, middleware-friendly |
| Editor | `@wordpress/block-editor` (React island) | Gutenberg without WordPress |
| Storage | Cloudflare R2 | S3-compatible, cheap, co-located |
| Deployment | Cloudflare Pages + D1 | Free tier is generous, global edge |
| CI/CD | GitHub Actions | Standard, integrates with CF |

---

## Phase Breakdown

### Phase 1 — Monorepo & Database Foundation
**Goal:** The project boots. The schema exists. Nothing breaks.

**Tasks:**
- Init pnpm workspace + Turborepo config
- Create `packages/core` with Drizzle schema matching:
  - `wp_posts` (posts, pages, attachments, nav_menu_items)
  - `wp_postmeta`
  - `wp_options`
  - `wp_terms`, `wp_term_taxonomy`, `wp_term_relationships`
  - `wp_users`, `wp_usermeta`
- Configure Cloudflare D1 as the database target
- Set up `apps/admin` with Astro SSR + Cloudflare adapter
- Add `turbo.json` with `build`, `dev`, `typecheck` pipelines
- Add a seed script that creates an initial Admin user + default options

**Done when:** `pnpm dev` starts both apps, schema migrations run against D1, seed script works.

---

### Phase 2 — Auth & Admin Shell
**Goal:** You can log in. The dashboard renders dynamic sidebar items.

**Tasks:**
- Implement Lucia Auth v3 in `packages/auth` targeting `wp_users`
- Add `wp_sessions` table to schema
- Build login / logout pages in `apps/admin`
- Create the **Registry Service** in `packages/core`:
  - `registerPostType(slug, config)` — adds CPT to sidebar
  - `registerTaxonomy(slug, config)` — attaches to post types
- Built-in registrations: `post`, `page`, `attachment`, `nav_menu_item`
- Dynamic sidebar in Admin that reads from Registry
- Protect all admin routes with auth middleware

**Done when:** Login works, dashboard loads, sidebar shows Posts + Pages, logout clears session.

---

### Phase 3 — Post Editor & Media Library
**Goal:** You can write and publish content. You can upload images.

**Tasks:**
- Build the Post list page (paginated, filterable by status)
- Build the Post edit page with:
  - Title field
  - Gutenberg `@wordpress/block-editor` embedded as a React island
  - Sidebar: publish status, visibility, date, categories, tags
  - Save as Draft / Publish actions (Hono API routes)
- Build the Media Library:
  - Upload API route → saves file to R2, creates `wp_posts` row with `post_type='attachment'`
  - Grid view of all attachments
  - Gutenberg media picker hooks into this endpoint
- Slug auto-generation from title

**Done when:** Can write a post with an image, publish it, see it saved in D1.

---

### Phase 4 — Public Front-End & Menus
**Goal:** Published content is visible to the world.

**Tasks:**
- `apps/web` fetches published posts/pages from the Hono API
- Dynamic routing: `/[slug]` for pages, `/blog/[slug]` for posts
- Homepage: latest posts list
- Default theme in `themes/default` — minimal, accessible, no dependencies
- Menu builder in Admin:
  - Create nav menus, add pages/posts/custom links
  - Save as `nav_menu_item` post type rows
- `apps/web` reads active menu from `wp_options` and renders it

**Done when:** A published post is publicly accessible at its slug with a navigation header.

---

### Phase 5 — Plugin System Foundation
**Goal:** A developer can drop a package into `/plugins` and it gets loaded.

**Tasks:**
- Plugin manifest standard: every plugin exports a `definePlugin(config)` default
- Plugin capabilities for MVP:
  - Register new post types / taxonomies via Registry
  - Add Hono middleware to the API
  - Add Admin sidebar links
- Plugin Loader script in `packages/core` that scans `plugins/*`
- Ship one example plugin: `plugins/seo` — adds `_yoast_wpseo_*` postmeta fields to the editor sidebar
- Document the Plugin API in `docs/plugin-api.md`

**Done when:** `plugins/seo` loads automatically, adds its UI, and stores meta without touching core.

---

### Phase 6 — One-Click Deployment
**Goal:** From git clone to live site in under 5 minutes.

**Tasks:**
- `wrangler.toml` templates for D1 + R2 + Pages
- Setup wizard page in Admin (shown on first boot before onboarding):
  - Accepts site title, admin email, password
  - Runs migrations, seeds options table, marks setup complete
- GitHub Actions workflow:
  - `pnpm build` via Turborepo
  - Run D1 migrations
  - Deploy `apps/admin` and `apps/web` to Cloudflare Pages
- `README.md` deploy-to-Cloudflare button
- Document env vars: `DATABASE_URL`, `R2_BUCKET`, `AUTH_SECRET`, `SITE_URL`

**Done when:** A fresh fork can be deployed to Cloudflare with zero manual infrastructure setup.

---

## MVP Milestone Definition

The MVP is **complete** when all of the following are true:

1. A user can deploy the project to Cloudflare from a GitHub fork in one command
2. They can log in to the admin, write a post with images, and publish it
3. The published post is publicly accessible on `apps/web`
4. A third-party developer can register a custom post type via a plugin package
5. All core packages have TypeScript types (no `any` escapes in `/packages/core`)

---

## Open Source Setup

- **License:** MIT
- **Repo name:** `astropress` (GitHub org: `astropress-cms`)
- **Branch strategy:** `main` (stable) + `develop` (active work)
- **Contributing guide:** `CONTRIBUTING.md` with setup instructions, PR checklist
- **Issue labels:** `phase/1` through `phase/6`, `good first issue`, `plugin`, `theme`
- **Discussions:** GitHub Discussions for plugin/theme ideas

### Files to include at launch
```
README.md           # What it is, one-click deploy button, feature list
PLAN.md             # This file
CONTRIBUTING.md     # How to run locally, PR process
LICENSE             # MIT
docs/
  plugin-api.md     # How to build plugins
  theme-api.md      # How to build themes
  deployment.md     # Cloudflare setup guide
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gutenberg packages are heavy (800KB+) | Load editor only on edit routes; lazy-import |
| D1 SQLite has limited concurrency | Acceptable for MVP scale; document limits clearly |
| Lucia Auth maintenance uncertainty | Abstract into `packages/auth` so swapping is one file change |
| Cloudflare-only locks users in | Drizzle adapter pattern allows Node/PlanetScale targets later |
| Scope creep (WooCommerce, multisite) | Hard "out of scope" list, reject PRs that touch it pre-v1 |

---

## What Comes After MVP (v1 Roadmap Hints)

- User roles & capabilities (Editor, Author, Contributor)
- REST API compatibility layer (so real WP plugins can talk to it)
- Theme marketplace scaffolding
- Comment system
- Full-text search via Cloudflare AI or D1 FTS
- `create-astropress-app` CLI

---

*Start with Phase 1. Do not move to Phase 2 until `pnpm dev` is stable and the full Drizzle schema is migrated. The schema is the contract everything else builds on.*
