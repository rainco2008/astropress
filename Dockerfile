# Multi-stage build for AstroPress (Node.js / non-Cloudflare deployment)
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY packages/ui/package.json ./packages/ui/
COPY apps/admin/package.json ./apps/admin/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS builder
COPY . .
RUN pnpm build

# Admin runtime
FROM node:20-alpine AS admin
RUN corepack enable
WORKDIR /app
COPY --from=builder /app/apps/admin/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin/package.json ./package.json
EXPOSE 4321
ENV HOST=0.0.0.0 PORT=4321 NODE_ENV=production
CMD ["node", "./dist/server/entry.mjs"]

# Web runtime
FROM node:20-alpine AS web
RUN corepack enable
WORKDIR /app
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json
EXPOSE 4322
ENV HOST=0.0.0.0 PORT=4322 NODE_ENV=production
CMD ["node", "./dist/server/entry.mjs"]
