# ⚡ AstroPress

> A fully open-source, WordPress-compatible CMS built on Astro — deployable in one click to Cloudflare.

No PHP. No legacy baggage. Just TypeScript, Astro, and Cloudflare's infrastructure.

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/astropress-cms/astropress)

---

## Features

- **WordPress-compatible schema** — same `wp_*` tables, same mental model
- **Gutenberg block editor** — write content with a familiar editing experience
- **Cloudflare-native** — D1 (SQLite) database, R2 object storage, Pages hosting
- **Session-based auth** — Lucia v3, no magic, easy to swap
- **Plugin system** — drop a package into `/plugins`, it gets loaded
- **Default theme** — minimal, accessible, zero dependencies
- **One-click deploy** — fork → configure secrets → push

---

## Quick Start (Local Dev)

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (for D1 locally)

### 1. Clone and install

```bash
git clone https://github.com/astropress-cms/astropress
cd astropress
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, AUTH_SECRET, SITE_URL
```

### 3. Create local D1 database and run migrations

```bash
npx wrangler d1 create astropress
# Copy the database_id into apps/admin/wrangler.toml and apps/web/wrangler.toml

npx wrangler d1 migrations apply astropress --local
```

### 4. Start dev servers

```bash
pnpm dev
```

- Admin: http://localhost:4321
- Public site: http://localhost:4322

The first time you visit the admin, you'll see the **setup wizard** — fill in your site title and admin credentials.

---

## Deploy to Cloudflare

### 1. Fork this repo on GitHub

### 2. Create Cloudflare resources

```bash
# D1 database
npx wrangler d1 create astropress

# R2 bucket
npx wrangler r2 bucket create astropress-media

# Pages projects
npx wrangler pages project create astropress-admin
npx wrangler pages project create astropress-web
```

### 3. Update wrangler configs

Edit `apps/admin/wrangler.toml` and `apps/web/wrangler.toml`:
- Replace `YOUR_D1_DATABASE_ID` with your D1 database ID
- Set `SITE_URL` to your Pages URL

### 4. Add GitHub secrets

In your fork's **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages + D1 + R2 permissions |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID |

### 5. Push to `main`

The GitHub Actions workflow builds both apps, runs D1 migrations, and deploys to Cloudflare Pages automatically.

Visit your admin Pages URL — the setup wizard runs on first boot.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite connection URL (local dev only) | Dev only |
| `AUTH_SECRET` | 32+ char random string for session signing | Production |
| `R2_BUCKET` | R2 bucket name | Production |
| `SITE_URL` | Full public URL of `apps/web` | Production |

---

## Monorepo Structure

```
astropress/
├── apps/
│   ├── admin/          # Astro SSR — CMS dashboard
│   └── web/            # Astro SSR — public front-end
├── packages/
│   ├── core/           # Drizzle schema, Registry, shared types
│   ├── auth/           # Lucia v3 session auth
│   ├── api/            # Hono router (foundation)
│   └── ui/             # Shared React components
├── plugins/
│   └── seo/            # Example SEO plugin
├── themes/
│   └── default/        # Default theme
└── docs/
    ├── plugin-api.md
    ├── theme-api.md
    └── deployment.md
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
