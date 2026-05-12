# Deployment Guide

## Cloudflare Stack

AstroPress runs entirely on Cloudflare's free tier:

| Service | Used for |
|---------|----------|
| Cloudflare Pages | Hosting `apps/admin` and `apps/web` |
| Cloudflare D1 | SQLite database |
| Cloudflare R2 | Media file storage |

## Step-by-Step

### 1. Create Cloudflare resources

```bash
# Authenticate wrangler
npx wrangler login

# Create D1 database — note the database_id in the output
npx wrangler d1 create astropress

# Create R2 bucket
npx wrangler r2 bucket create astropress-media

# Create Pages projects
npx wrangler pages project create astropress-admin
npx wrangler pages project create astropress-web
```

### 2. Configure wrangler.toml files

Update `apps/admin/wrangler.toml`:
```toml
database_id = "YOUR_ID_FROM_STEP_1"
```

Update `apps/web/wrangler.toml`:
```toml
database_id = "YOUR_ID_FROM_STEP_1"
```

### 3. Run migrations

```bash
npx wrangler d1 migrations apply astropress --remote
```

### 4. Deploy manually (first time)

```bash
pnpm build
cd apps/admin && npx wrangler pages deploy dist --project-name astropress-admin
cd ../web && npx wrangler pages deploy dist --project-name astropress-web
```

### 5. Set up GitHub Actions (CI/CD)

Add these secrets to your GitHub repo:

- `CLOUDFLARE_API_TOKEN` — create at dash.cloudflare.com → My Profile → API Tokens
  - Permissions: `Cloudflare Pages:Edit`, `D1:Edit`, `Workers R2 Storage:Edit`
- `CF_ACCOUNT_ID` — found on the right side of the Cloudflare dashboard homepage

Push to `main` to trigger automatic deploys.

## First Boot

Visit your admin Pages URL. The setup wizard will:
1. Accept your site title, URL, and admin credentials
2. Seed the options table
3. Mark setup as complete

You will not see the wizard again after setup.

## Environment Variables

Set these in Cloudflare Pages dashboard under **Settings → Environment variables**:

| Variable | Example |
|----------|---------|
| `SITE_URL` | `https://my-blog.pages.dev` |
| `AUTH_SECRET` | 32-character random string |
