import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";

const HEALTH_DB_TIMEOUT_MS = 2_000;

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/healthz", async () => {
    let dbStatus: "ok" | "down" = "ok";
    try {
      const probe = app.db.execute(sql`select 1`);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("db probe timeout")), HEALTH_DB_TIMEOUT_MS),
      );
      await Promise.race([probe, timeout]);
    } catch {
      dbStatus = "down";
    }
    return { status: "ok" as const, db: dbStatus };
  });
};
