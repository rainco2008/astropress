# AstroPress

A fully open-source, WordPress-compatible CMS built on Astro — deployable to Cloudflare in one command.

No PHP. No legacy baggage. TypeScript, Astro 4 SSR, Drizzle ORM, and Cloudflare's infrastructure.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/awsmin/AstroPress)

---

## What it is

AstroPress is a modern CMS that speaks WordPress — same `wp_*` database schema, same mental model — but runs on the edge with zero PHP. Developers get the extensibility of WordPress; users get a fast, cheap, globally-distributed site.

**Key features:**
- WordPress-compatible `wp_*` schema (Drizzle ORM + SQLite/D1)
- Gutenberg block editor embedded in the admin (`@wordpress/block-editor` React island)
- Custom post types, taxonomies, custom fields (ACF-style) — all managed via UI
- WPForms-style form builder with entries, conditional logic, multi-page
- Navigation menus with drag-and-drop reorder and submenu nesting
- Plugin system — drop a package in `/plugins`, register it in `apps/admin/src/plugins.ts`
- Cloudflare-native: D1 database + R2 object storage + Pages hosting
- Session-based auth (Lucia v3)

---

## Monorepo Structure

```
astropress/
├── apps/
│   ├── admin/              # Astro SSR — CMS dashboard (port 4321)
│   │   ├── src/
│   │   │   ├── islands/    # React islands (BlockEditor, FormBuilder, etc.)
│   │   │   ├── layouts/    # AdminLayout.astro
│   │   │   ├── lib/        # icons.ts, media.ts, posts.ts, slugify.ts
│   │   │   ├── middleware.ts
│   │   │   ├── pages/
│   │   │   │   ├── admin/  # Dashboard, Posts, Pages, Forms, Menus, Settings …
│   │   │   │   └── api/    # REST endpoints
│   │   │   └── plugins.ts  # Plugin bootstrap
│   └── web/                # Astro SSR — public front-end (port 4322)
│       └── src/
│           ├── lib/        # query.ts (re-exported from core), formRenderer.ts
│           ├── layouts/    # BaseLayout.astro
│           └── pages/      # [slug].astro, blog/[slug].astro, index.astro …
├── packages/
│   ├── core/               # Drizzle schema, registry, query helpers, types
│   │   └── src/
│   │       ├── query.ts    # WordPress-style data helpers (queryPosts, getField …)
│   │       ├── registry/   # Post type & taxonomy registry
│   │       ├── schema/     # wp_posts, wp_options, wp_terms, wp_users …
│   │       └── db.ts
│   ├── auth/               # Lucia v3 session auth
│   ├── api/                # Hono router foundation
│   └── ui/                 # Shared React components
├── plugins/
│   └── seo/                # First-party SEO plugin
├── themes/
│   └── default/            # Default front-end theme
├── docs/
│   ├── plugin-api.md
│   ├── theme-api.md
│   └── deployment.md
├── pnpm-workspace.yaml
├── turbo.json
└── wrangler.toml
```

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

### 3. Start dev servers

```bash
pnpm dev
```

| App | URL |
|-----|-----|
| Admin | http://localhost:4321 |
| Public site | http://localhost:4322 |

Visit http://localhost:4321 — the **setup wizard** runs on first boot to create your admin account.

### Restart a single app

```bash
# Kill port and restart
lsof -ti :4321 | xargs kill -9
cd apps/admin && pnpm dev
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

Full API reference:

| Function | WP equivalent |
|---|---|
| `queryPosts(db, args)` | `WP_Query` |
| `getPost(db, idOrSlug, type?)` | `get_post()` |
| `getPostById(db, id)` | `get_post()` |
| `getPostBySlug(db, slug, type?)` | `get_page_by_path()` |
| `getChildren(db, parentId)` | `get_children()` |
| `getAncestors(db, postId)` | parent chain, root-first |
| `getField(db, postId, key)` | ACF `get_field()` |
| `theField(db, postId, key)` | ACF `the_field()` — never null |
| `getFields(db, postId)` | all meta as `Record<string,string>` |
| `updatePostMeta(db, id, key, val)` | `update_post_meta()` |
| `getTerms(db, taxonomy, args?)` | `get_terms()` |
| `getPostTerms(db, postId, taxonomy)` | `get_the_terms()` |
| `getPostsByTerm(db, slug, taxonomy)` | `WP_Query` with `tax_query` |
| `getOption(db, name, fallback?)` | `get_option()` |
| `updateOption(db, name, value)` | `update_option()` |
| `getSiteInfo(db)` | `get_bloginfo()` |
| `getAuthor(db, userId)` | `get_userdata()` |

WP-cased aliases (`get_field`, `wp_query`, `the_field`, etc.) are also exported.

---

## Icon Pack

All admin UI icons live in `apps/admin/src/lib/icons.ts` and are importable by any admin page or island:

```ts
import { adminIcons, getIcon, ICON_NAMES } from "../lib/icons";

// In Astro templates
<Fragment set:html={adminIcons.dashboard} />
<Fragment set:html={getIcon(postType.config.icon)} />

// For a picker (post type editor)
ICON_NAMES.forEach(name => adminIcons[name])
```

Icons: `dashboard`, `post`, `page`, `folder`, `forms`, `fields`, `posttypes`, `taxonomies`, `plugins`, `menus`, `settings`, `user`, `bolt`, `logout`, plus 40+ content-type icons (`book`, `image`, `video`, `music`, `camera`, `globe`, `calendar`, `star`, `chart`, `briefcase`, `users`, …).

All icons are flat inline SVGs — 24×24 viewBox, `stroke="currentColor"`, stroke-width 1.75, round caps.

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

## Custom Fields (ACF-style)

Custom field groups are created in the admin under **Structure → Custom Fields**. Each group has:
- Location rules (attach to post type, taxonomy, etc.)
- Field types: text, textarea, number, select, checkbox, radio, image, file, wysiwyg, repeater, group, flexible content, and more
- Conditional logic per field

Read values with `getField(db, postId, "field_name")` or the `get_field` alias.

---

## Forms

Forms are built in the admin under **Forms** using the drag-and-drop form builder. Embed on any page/post by adding the `astropress/form` block in the Gutenberg editor and selecting the form. The block renders server-side — no iframe, no JavaScript required for basic display.

Form entries are viewable in **Forms → Entries**.

---

## Deploy to Cloudflare

### One-click deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/awsmin/AstroPress)

Clicking the button will:

1. Fork this repo to your GitHub account
2. Create a Cloudflare Pages project linked to the fork
3. Prompt you to authorise Cloudflare to access your GitHub account
4. Set up the CI/CD pipeline — every push to `main` triggers a build and deploy

**What you need before clicking:**
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- A GitHub account

**After the fork is created**, finish the setup in two minutes:

```bash
# 1. Clone your fork
git clone https://github.com/<your-username>/astropress
cd astropress

# 2. Create a D1 database and R2 bucket
npx wrangler d1 create astropress
npx wrangler r2 bucket create astropress-media

# 3. Paste the database_id into both wrangler configs
#    apps/admin/wrangler.toml  →  [[d1_databases]] database_id = "..."
#    apps/web/wrangler.toml    →  [[d1_databases]] database_id = "..."

# 4. Run migrations against production D1
npx wrangler d1 execute astropress --remote --file=./migrations/0001_init.sql

# 5. Push — GitHub Actions deploys both apps automatically
git push
```

Your admin will be live at the Cloudflare Pages URL shown in the dashboard.

---

### Manual deploy (CLI only)

If you prefer not to use the button:

#### 1. Create Cloudflare resources

```bash
npx wrangler d1 create astropress
npx wrangler r2 bucket create astropress-media
npx wrangler pages project create astropress-admin
npx wrangler pages project create astropress-web
```

#### 2. Update wrangler configs

In `apps/admin/wrangler.toml` and `apps/web/wrangler.toml`:
- Replace `database_id` with your D1 database ID
- Set `SITE_URL` to your Pages URL

#### 3. Add GitHub secrets

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages + D1 + R2 permissions |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID |

#### 4. Push to `main`

GitHub Actions builds both apps, runs D1 migrations, and deploys to Cloudflare Pages automatically.

---

## Environment Variables

| Variable | Used in | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Both apps (dev) | SQLite URL, e.g. `file:./local.db` |
| `AUTH_SECRET` | Admin | 32+ char string for session signing |
| `SITE_URL` | Admin | Full public URL of the web app |
| `R2_BUCKET` | Admin | R2 bucket name for media uploads |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/](docs/).

## License

MIT — see [LICENSE](LICENSE).
