import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index";

export type Database = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzleD1(d1, { schema });
}

export async function createLocalDb(url: string) {
  const client = createClient({ url });
  return drizzleLibsql(client, { schema });
}

export { schema };
