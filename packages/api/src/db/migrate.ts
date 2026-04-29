import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { createPool, createDb } from "./client.js";
import { redactSecrets } from "../log-redact.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ADVISORY_LOCK_KEY = 4242424242;

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = createPool(databaseUrl);
  const db = createDb(pool);
  const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "migrations");
  await db.execute(sql`select pg_advisory_lock(${ADVISORY_LOCK_KEY})`);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${ADVISORY_LOCK_KEY})`);
  }
  await pool.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  runMigrations(url)
    .then(() => {
      console.log("migrations applied");
      process.exit(0);
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("migration failed:", redactSecrets(msg));
      process.exit(1);
    });
}
