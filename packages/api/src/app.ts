import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import type { Db } from "./db/client.js";
import type { Env } from "./env.js";
import { HttpError } from "./errors.js";
import { todosRoutes } from "./routes/todos.js";
import { healthRoutes } from "./routes/health.js";

export interface BuildAppOptions {
  db: Db;
  env: Env;
  /** Override the request id generator (used by tests for determinism). */
  generateRequestId?: () => string;
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: opts.env.LOG_LEVEL,
      transport:
        opts.env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss.l", ignore: "pid,hostname" } }
          : undefined,
    },
    genReqId: opts.generateRequestId ?? (() => randomUUID()),
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
  });

  await app.register(cors, {
    origin: opts.env.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });

  app.addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof HttpError) {
      reply.code(err.statusCode).send({
        error: err.errorToken,
        message: err.message,
        code: err.errorCode,
      });
      return;
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      reply.code(400).send({
        error: "validation_error",
        message: first ? `${first.path.join(".") || "body"}: ${first.message}` : "validation failed",
        code: "request.invalid",
      });
      return;
    }
    if (
      err !== null &&
      typeof err === "object" &&
      "validation" in err &&
      (err as { validation: unknown }).validation
    ) {
      const e = err as { message?: string };
      reply.code(400).send({
        error: "validation_error",
        message: e.message ?? "validation failed",
        code: "request.invalid",
      });
      return;
    }
    req.log.error({ err }, "unhandled error");
    reply.code(500).send({
      error: "internal_error",
      message: "Internal Server Error",
      code: "internal.unexpected",
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({
      error: "not_found",
      message: "Route not found",
      code: "route.not_found",
    });
  });

  app.decorate("db", opts.db);

  await app.register(healthRoutes);
  await app.register(todosRoutes, { prefix: "/todos" });

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}
