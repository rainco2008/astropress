# AstroPress

A fully open-source, WordPress-compatible CMS built on Astro — admin and public frontend in a single deployment.

No PHP. No legacy baggage. TypeScript, Astro 4 SSR, Drizzle ORM, and your choice of hosting.

---

## Deploy

| Platform | One-click |
|----------|-----------|
| Cloudflare Pages | [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/awsmin/AstroPress) |
| Railway | [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/astropress) |
| Render | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/awsmin/AstroPress) |
| Docker | `docker compose up` — see [Docker](#docker) below |

---

## What it is

AstroPress is a modern CMS that speaks WordPress — same `wp_*` database schema, same mental model — but runs on the edge with zero PHP. Developers get the extensibility of WordPress; users get a fast, cheap, globally-distributed site.

**Key features:**
- WordPress-compatible `wp_*` schema (Drizzle ORM + SQLite/D1)
- Visual block-based page and theme editor (full-screen ThemeEditor)
- Gutenberg block editor for posts and classic content
- Custom post types, taxonomies, custom fields (ACF-style) — all managed via UI
- WPForms-style form builder with entries, conditional logic, multi-page
- Navigation menus with drag-and-drop reorder and submenu nesting
- Plugin system — drop a package in `/plugins`, register in `apps/admin/src/plugins.ts`
- Single installation — admin (`/admin/*`) and public frontend (`/*`) in one app
- Cloudflare-native: D1 database + R2 object storage + Pages hosting
- Session-based auth (Lucia v3)

---

## Architecture

AstroPress runs as a **single Astro SSR app** that serves both the admin dashboard and the public-facing website:

```
/              → public homepage (blog list or static front page)
/blog/[slug]   → blog post
/[slug]        → page (supports visual block editor)
/forms/[id]    → standalone form page
/admin/*       → CMS dashboard (auth required)
/api/*         → REST API (most endpoints require auth)
```

Everything shares one database. No separate frontend deployment needed.

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+

### 1. Install dependencies

```bash
git clone https://github.com/awsmin/AstroPress
cd astropress
pnpm install
```

### 2. Set up the local database

```bash
pnpm db:setup        # runs migrations against local.db
pnpm db:seed         # optional: seeds demo content
```

### 3. Start dev server

```bash
pnpm dev
```

| URL | Description |
|-----|-------------|
| http://localhost:4321 | Admin + public site |
| http://localhost:4321/admin | CMS dashboard |

Visit http://localhost:4321 — the **setup wizard** runs on first boot to create your admin account.

---

## Deploy to Cloudflare Pages

### One-click deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/awsmin/AstroPress)

Clicking the button will:

1. Fork this repo to your GitHub account
2. Create a Cloudflare Pages project linked to the fork
3. Set up CI/CD — every push to `main` triggers a build and deploy

**After the fork is created:**

```bash
# 1. Clone your fork
git clone https://github.com/<your-username>/astropress
cd astropress

# 2. Create a D1 database and R2 bucket (run from apps/admin)
cd apps/admin
npx wrangler d1 create astropress
npx wrangler r2 bucket create astropress-media

# 3. Paste the database_id into apps/admin/wrangler.toml
#    [[d1_databases]] database_id = "paste-here"

# 4. Run migrations against production D1
npx wrangler d1 execute astropress --remote --file=../../migrations/0001_init.sql

# 5. Push from repo root — Cloudflare Pages deploys automatically
cd ../..
git push
```

> Wrangler must be run from `apps/admin/` (not the monorepo root) because this is a pnpm workspace.

### Manual CLI deploy

```bash
cd apps/admin
npx wrangler d1 create astropress
npx wrangler r2 bucket create astropress-media
npx wrangler pages project create astropress

# Build and deploy
cd ../..
ASTRO_ADAPTER=cloudflare pnpm build --filter @astropress/admin
cd apps/admin && npx wrangler pages deploy dist
```

---

## Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/astropress)

Or manually:

1. Push the repo to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Set environment variables in the Railway dashboard:
   - `DATABASE_URL` — e.g. `file:./data/astropress.db` (Railway persistent volume) or a PostgreSQL URL
   - `AUTH_SECRET` — a random 32+ character string

Railway auto-detects `railway.toml` and builds with Docker.

---

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/awsmin/AstroPress)

Render reads `render.yaml` automatically. Set `DATABASE_URL` in the Render dashboard after the first deploy. A 1 GB persistent disk is attached at `/app/data` for the SQLite database.

---

## Docker

### Quick start

```bash
cp .env.example .env     # edit AUTH_SECRET
docker compose up
```

Open http://localhost:4321 — setup wizard runs on first boot.

### Build image manually

```bash
docker build -t astropress .
docker run -p 4321:4321 \
  -e DATABASE_URL=file:./data/astropress.db \
  -e AUTH_SECRET=your-secret-here \
  -v $(pwd)/data:/app/data \
  astropress
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite: `file:./data/astropress.db` · PostgreSQL: `postgres://...` |
| `AUTH_SECRET` | 32+ char string for session signing |

On **Cloudflare Pages**, the D1 database is bound automatically via `wrangler.toml` — no `DATABASE_URL` needed.

---

## Monorepo Structure

```
astropress/
├── apps/
│   └── admin/              # Single Astro SSR app (admin + public frontend)
│       └── src/
│           ├── components/ # BlockRenderer.astro
│           ├── islands/    # React islands (BlockEditor, FormBuilder, ThemeEditor …)
│           ├── layouts/    # AdminLayout.astro, BaseLayout.astro
│           ├── lib/        # icons.ts, posts.ts, public-query.ts, formRenderer.ts …
│           ├── middleware.ts
│           ├── pages/
│           │   ├── index.astro          # public homepage
│           │   ├── [slug].astro         # public pages
│           │   ├── blog/[slug].astro    # blog posts
│           │   ├── forms/[id].astro     # standalone form page
│           │   ├── admin/               # CMS dashboard pages
│           │   └── api/                 # REST endpoints
│           └── plugins.ts
├── packages/
│   ├── core/               # Drizzle schema, registry, query helpers, types
│   ├── auth/               # Lucia v3 session auth
│   ├── api/                # Hono router foundation
│   └── ui/                 # Shared React components
├── plugins/
│   └── seo/                # First-party SEO plugin
├── themes/
│   └── default/            # Default front-end theme styles
├── Dockerfile
├── docker-compose.yml
├── railway.toml
├── render.yaml
└── wrangler.toml
```

---

## Data Layer — Query Helpers

Import from `@astropress/core/query` in any Astro page:

```astro
---
import { queryPosts, getField, getPostTerms, getSiteInfo } from "@astropress/core/query";

const db = Astro.locals.db;

// Like WP_Query
const { posts, total, pages } = await queryPosts(db, {
  type: "book",
  perPage: 12,
  orderBy: "title",
  order: "asc",
});

// Like ACF get_field / get_post_meta
const price = await getField(db, post.id, "price");

// Like get_the_terms
const categories = await getPostTerms(db, post.id, "category");

// Like get_bloginfo
const site = await getSiteInfo(db);
---
```

| Function | WP equivalent |
|---|---|
| `queryPosts(db, args)` | `WP_Query` |
| `getPost(db, idOrSlug, type?)` | `get_post()` |
| `getPostById(db, id)` | `get_post()` |
| `getPostBySlug(db, slug, type?)` | `get_page_by_path()` |
| `getField(db, postId, key)` | ACF `get_field()` |
| `getFields(db, postId)` | all meta as `Record<string,string>` |
| `getTerms(db, taxonomy, args?)` | `get_terms()` |
| `getPostTerms(db, postId, taxonomy)` | `get_the_terms()` |
| `getOption(db, name, fallback?)` | `get_option()` |
| `getSiteInfo(db)` | `get_bloginfo()` |

---

## Plugin System

1. Create a package in `/plugins/my-plugin/`
2. Export a plugin config:

```ts
// plugins/my-plugin/src/index.ts
import { definePlugin, registerPostType } from "@astropress/core";

export default definePlugin({
  name: "My Plugin",
  version: "1.0.0",
  register() {
    registerPostType("product", {
      label: "Product",
      pluralLabel: "Products",
      icon: "bag",
      public: true,
      showInMenu: true,
      supports: ["title", "editor", "thumbnail", "custom-fields"],
    });
  },
});
```

3. Load it in `apps/admin/src/plugins.ts`:

```ts
import myPlugin from "@astropress/my-plugin";
loadPlugin(myPlugin);
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/](docs/).

## License

MIT — see [LICENSE](LICENSE).
