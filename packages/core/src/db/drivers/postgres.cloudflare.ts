export function createPostgresDb(): never {
  throw new Error("PostgreSQL is not available in Cloudflare builds. Use the DB D1 binding instead.");
}

export type PostgresDb = never;
