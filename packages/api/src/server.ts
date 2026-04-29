import { loadEnv } from "./env.js";
import { createPool, createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { buildApp } from "./app.js";
import { redactSecrets } from "./log-redact.js";

const FORCE_EXIT_MS = 10_000;

async function main(): Promise<void> {
  const env = loadEnv();

  await runMigrations(env.DATABASE_URL);

  const pool = createPool(env.DATABASE_URL);
  const db = createDb(pool);
  const app = await buildApp({ db, env });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    setTimeout(() => {
      app.log.error({ signal, ms: FORCE_EXIT_MS }, "force exit on shutdown timeout");
      process.exit(1);
    }, FORCE_EXIT_MS).unref();
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await app.listen({ host: "0.0.0.0", port: env.PORT });
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(redactSecrets(msg));
  process.exit(1);
});
