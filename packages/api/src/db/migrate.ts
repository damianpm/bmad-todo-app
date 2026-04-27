import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool, createDb } from "./client.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = createPool(databaseUrl);
  const db = createDb(pool);
  const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "migrations");
  await migrate(db, { migrationsFolder });
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
      console.error(err);
      process.exit(1);
    });
}
