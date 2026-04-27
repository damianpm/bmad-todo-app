import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { FastifyInstance } from "fastify";
import { createPool, createDb, type Db } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import { buildApp } from "../../src/app.js";
import type pg from "pg";

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  pool: pg.Pool;
  container: StartedPostgreSqlContainer;
  databaseUrl: string;
  cleanup: () => Promise<void>;
}

export async function startTestApp(): Promise<TestApp> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("todos_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const databaseUrl = container.getConnectionUri();
  await runMigrations(databaseUrl);

  const pool = createPool(databaseUrl);
  const db = createDb(pool);

  const app = await buildApp({
    db,
    env: {
      DATABASE_URL: databaseUrl,
      PORT: 0,
      LOG_LEVEL: "fatal",
      CORS_ORIGIN: "http://localhost:8080",
      NODE_ENV: "test",
    },
  });

  return {
    app,
    db,
    pool,
    container,
    databaseUrl,
    cleanup: async () => {
      await app.close();
      try {
        await pool.end();
      } catch {
        // pool may already be ended by a test (e.g. /healthz down probe)
      }
      await container.stop();
    },
  };
}
