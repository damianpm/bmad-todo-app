import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/healthz", async () => {
    let dbStatus: "ok" | "down" = "ok";
    try {
      await app.db.execute(sql`select 1`);
    } catch {
      dbStatus = "down";
    }
    return { status: "ok" as const, db: dbStatus };
  });
};
