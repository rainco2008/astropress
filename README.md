# AstroPress

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fawsmin%2FAstroPress&project-name=astropress)

AstroPress 是一个基于 Astro 的开源 CMS。它保留 WordPress 风格的 `wp_*` 数据结构和内容管理思路，但运行时不依赖 PHP，管理后台和公开站点可以作为同一个 Astro SSR 应用部署。

## 一键部署

| 平台 | 部署入口 |
| --- | --- |
| Cloudflare Workers / Pages | [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fawsmin%2FAstroPress&project-name=astropress) |
| Railway | [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/astropress) |
| Render | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/awsmin/AstroPress) |
| Docker | `docker compose up` |

## 技术栈

| 组件 | 版本 | 用途 |
| --- | --- | --- |
| Astro | `^6.4.7` | SSR 应用框架 |
| @astrojs/cloudflare | `^13.7.0` | Cloudflare Workers / Pages 适配器 |
| @astrojs/node | `^10.1.4` | 本地、Docker、VPS Node 部署适配器 |
| @astrojs/react | `^5.0.7` | 管理后台 React islands |
| @astrojs/check | `^0.9.9` | Astro 类型检查 |
| Wrangler | `^4.100.0` | Cloudflare 构建和部署工具 |
| @cloudflare/workers-types | `^4.20260615.1` | Cloudflare Runtime 类型 |
| TypeScript | `^5.4.0` | 类型系统 |
| Turbo | `^2.9.18` | Monorepo 任务编排 |
| Drizzle ORM | `^0.45.2` | 数据库 schema 和查询 |
| drizzle-kit | `^0.31.10` | 数据库迁移生成 |
| @libsql/client | `^0.14.0` | SQLite / LibSQL / Turso 连接 |
| postgres | `^3.4.0` | PostgreSQL 连接，仅 Node 环境使用 |
| Hono | `^4.12.25` | API 路由基础 |
| React | `^18.2.0` | 后台交互组件 |
| React DOM | `^18.2.0` | React DOM 渲染 |
| Lucia | `^3.2.0` | 会话认证 |

根依赖还配置了 `pnpm.overrides`，用于固定已修复安全漏洞的间接依赖版本：`esbuild >=0.28.1`、`ws >=8.21.0`、`yaml >=2.8.3`、`js-yaml >=4.2.0`、`@babel/core >=7.29.6`。

## 功能概览

- 单应用部署：`/admin/*` 是 CMS 后台，`/*` 是公开站点。
- WordPress 风格数据结构：核心表沿用 `wp_*` 命名。
- 可视化页面和主题编辑器。
- 文章、页面、自定义内容类型、自定义分类、自定义字段。
- 表单构建器、表单提交记录、条件逻辑和多页表单。
- 菜单管理，支持拖拽排序和多级菜单。
- 插件系统，可在 `plugins/` 下扩展。
- Cloudflare 原生部署：D1 数据库、R2 媒体存储、Workers / Pages 运行时。
- Node 部署支持：本地 SQLite、LibSQL/Turso 或 PostgreSQL。

## 本地开发

### 环境要求

- Node.js `>=20`
- pnpm `>=9`

### 安装依赖

```bash
git clone https://github.com/awsmin/AstroPress
cd AstroPress
pnpm install
```

### 初始化本地数据库

```bash
pnpm db:setup
pnpm db:seed
```

### 启动开发服务

```bash
pnpm dev
```

默认入口：

| 地址 | 说明 |
| --- | --- |
| `http://localhost:4321` | 管理后台和公开站点 |
| `http://localhost:4321/admin` | CMS 后台 |
| `http://localhost:4322` | 独立 web app 开发入口 |

首次访问会进入安装向导，用于创建管理员账号。

## Cloudflare 部署

点击 README 顶部的 Cloudflare 按钮后，按 Cloudflare 页面提示 fork 并创建项目。推荐配置：

| 配置项 | 值 |
| --- | --- |
| Root directory | `apps/admin` |
| Build command | `ASTRO_ADAPTER=cloudflare pnpm build` |
| Build output directory | `dist` |
| Deploy command | 留空 |

需要绑定以下 Cloudflare 资源：

| Binding | 类型 | 说明 |
| --- | --- | --- |
| `DB` | D1 Database | 存储 CMS 内容 |
| `R2` | R2 Bucket | 存储媒体文件 |
| `AI` | Workers AI | 可选，用于后台 AI 功能 |

Cloudflare 构建使用 D1。PostgreSQL driver 已在 Cloudflare 构建中替换为专用 stub，避免部署时报 `Could not resolve "postgres"`。

## 手动部署到 Cloudflare

```bash
cd apps/admin
npx wrangler d1 create astropress
npx wrangler r2 bucket create astropress-media
ASTRO_ADAPTER=cloudflare pnpm build
npx wrangler deploy
```

D1、R2、AI binding 仍建议在 Cloudflare Dashboard 中确认。

## Node / Docker 部署

Node 环境默认使用 `@astrojs/node` adapter，可通过 `DATABASE_URL` 指定数据库：

```bash
DATABASE_URL=file:./data/astropress.db
AUTH_SECRET=your-32-character-secret
```

Docker 快速启动：

```bash
cp .env.example .env
docker compose up
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动所有开发服务 |
| `pnpm build` | 构建全部 workspace |
| `pnpm build:cf` | 构建 Cloudflare 版本 |
| `pnpm deploy:cf` | 构建并使用 Wrangler 部署 |
| `pnpm typecheck` | 类型检查 |
| `pnpm db:setup` | 初始化本地数据库 |
| `pnpm db:seed` | 写入演示数据 |
| `pnpm audit --audit-level low` | 检查依赖漏洞 |

## Monorepo 结构

```text
astropress/
├── apps/
│   ├── admin/          # CMS 后台和公开站点主应用
│   └── web/            # 独立公开站点应用
├── packages/
│   ├── api/            # API 基础包
│   ├── auth/           # 会话认证
│   ├── core/           # 数据库、schema、registry、query helpers
│   └── ui/             # 共享 UI 组件
├── plugins/
│   └── seo/            # 内置 SEO 插件
├── themes/
│   └── default/        # 默认主题
├── docs/               # 项目文档
├── migrations/         # SQLite / PostgreSQL 迁移
├── Dockerfile
├── docker-compose.yml
├── railway.toml
├── render.yaml
└── wrangler.toml
```

## 查询工具示例

```astro
---
import { queryPosts, getField, getPostTerms, getSiteInfo } from "@astropress/core/query";

const db = Astro.locals.db;

const { posts, total, pages } = await queryPosts(db, {
  type: "post",
  perPage: 10,
  orderBy: "date",
  order: "desc",
});

const site = await getSiteInfo(db);
---
```

## 许可证

MIT，详见 [LICENSE](LICENSE)。
