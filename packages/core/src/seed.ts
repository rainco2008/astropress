/**
 * Seed script — creates initial admin user and default options.
 * Run via: pnpm db:seed
 *
 * Requires environment variables:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, SITE_TITLE, SITE_URL
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { wpUsers, wpOptions } from "./schema/index";
// Use the same hashing function as the runtime auth package
import { hashPassword } from "@astropress/auth";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const client = createClient({ url });
  const db = drizzle(client);

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
  const siteTitle = process.env.SITE_TITLE ?? "My AstroPress Site";
  const siteUrl = process.env.SITE_URL ?? "http://localhost:4321";

  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPass = await hashPassword(adminPassword);
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  await db.insert(wpUsers).values({
    userLogin: "admin",
    userPass: hashedPass,
    userNicename: "admin",
    userEmail: adminEmail,
    userUrl: siteUrl,
    userRegistered: now,
    userStatus: 0,
    displayName: "Admin",
  });

  // Default options (mirrors WordPress defaults)
  const options = [
    { optionName: "siteurl", optionValue: siteUrl },
    { optionName: "blogname", optionValue: siteTitle },
    { optionName: "blogdescription", optionValue: "Just another AstroPress site" },
    { optionName: "admin_email", optionValue: adminEmail },
    { optionName: "posts_per_page", optionValue: "10" },
    { optionName: "active_plugins", optionValue: "a:0:{}" },
    { optionName: "template", optionValue: "default" },
    { optionName: "stylesheet", optionValue: "default" },
    { optionName: "permalink_structure", optionValue: "/%year%/%monthnum%/%day%/%postname%/" },
    { optionName: "upload_path", optionValue: "" },
    { optionName: "astropress_version", optionValue: "0.0.1" },
    { optionName: "astropress_db_version", optionValue: "1" },
  ];

  for (const option of options) {
    await db.insert(wpOptions).values(option).onConflictDoNothing();
  }

  console.log("✅ Seed complete!");
  console.log(`   Admin user: admin / ${adminPassword}`);
  console.log(`   Site URL: ${siteUrl}`);

  client.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
