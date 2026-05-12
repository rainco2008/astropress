import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.DATABASE_URL ?? "file:./local.db";

// Resolve @libsql/client from apps/admin (which has it as a direct dep)
const require = createRequire(
  pathToFileURL(join(__dirname, "../apps/admin/package.json"))
);
const { createClient } = require("@libsql/client");

const client = createClient({ url: dbUrl });

const migrationFile = join(__dirname, "../packages/core/migrations/0000_pale_luminals.sql");
const sql = await readFile(migrationFile, "utf-8");

// SQLite doesn't support multiple statements in one execute — split on -->
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} migration statements to ${dbUrl}...`);

for (const stmt of statements) {
  await client.execute(stmt);
}

console.log("✅ Migrations applied!");
client.close();
