import { defineMiddleware } from "astro:middleware";
import { createLocalDb } from "@astropress/core";

const DB_URL = import.meta.env.DATABASE_URL ?? "file:./local.db";

let _db: Awaited<ReturnType<typeof createLocalDb>> | null = null;
async function getDb() {
  if (!_db) _db = await createLocalDb(DB_URL);
  return _db;
}

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.db = await getDb();
  return next();
});
