import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import react from "@astrojs/react";
import { astropress } from "@astropress/core/integration";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// Resolve DB path relative to this config file so it works regardless of
// which directory turbo/pnpm runs the dev server from.
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../../local.db");

// Default to Node adapter (local dev, Docker, VPS).
// Set ASTRO_ADAPTER=cloudflare for Cloudflare Pages builds.
const isCloudflare = process.env.ASTRO_ADAPTER === "cloudflare";

export default defineConfig({
  output: "server",
  adapter: isCloudflare ? cloudflare() : node({ mode: "standalone" }),
  integrations: [
    react(),
    astropress({
      // Absolute path — always points to monorepo root local.db regardless of CWD.
      // Override for other backends:
      //   database: { url: "postgresql://user:pass@host/astropress" }
      //   database: { url: "libsql://your-db.turso.io", authToken: "ey..." }
      // On Cloudflare Pages the D1 binding is detected automatically.
      database: { url: `file:${dbPath}` },
    }),
  ],
  vite: {
    resolve: {
      alias: isCloudflare
        ? [
            {
              find: /\/packages\/core\/src\/db\/drivers\/postgres(\.ts)?$/,
              replacement: resolve(__dirname, "../../packages/core/src/db/drivers/postgres.cloudflare.ts"),
            },
          ]
        : [],
    },
    ssr: {
      external: isCloudflare
        ? ["node:fs/promises", "node:path", "node:fs", "node:os"]
        : ["node:fs/promises", "node:path", "node:fs", "node:os"],
    },
  },
});
