import { loadEnv } from "./env.js";
import { createPool, createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const env = loadEnv();

  await runMigrations(env.DATABASE_URL);

  const pool = createPool(env.DATABASE_URL);
  const db = createDb(pool);
  const app = await buildApp({ db, env });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await app.listen({ host: "0.0.0.0", port: env.PORT });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
