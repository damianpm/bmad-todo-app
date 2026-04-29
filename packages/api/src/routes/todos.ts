import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdParamSchema,
  type Todo,
} from "@bmad-todo/shared";
import { todos, type TodoRow } from "../db/schema.js";
import { NotFound } from "../errors.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().nonnegative().default(0),
});

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  };
}

export const todosRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const { limit, offset } = ListQuerySchema.parse(req.query);
    const rows = await app.db
      .select()
      .from(todos)
      .orderBy(desc(todos.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(rowToTodo);
  });

  app.post("/", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const body = CreateTodoSchema.parse(req.body);
    const [row] = await app.db.insert(todos).values({ text: body.text }).returning();
    if (!row) throw new Error("insert returned no row");
    reply.code(201).send(rowToTodo(row));
  });

  app.patch("/:id", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const { id } = TodoIdParamSchema.parse(req.params);
    const body = UpdateTodoSchema.parse(req.body);
    const [row] = await app.db
      .update(todos)
      .set({ completed: body.completed })
      .where(eq(todos.id, id))
      .returning();
    if (!row) throw NotFound("todo", id);
    return rowToTodo(row);
  });

  app.delete("/:id", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const { id } = TodoIdParamSchema.parse(req.params);
    const result = await app.db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
    if (result.length === 0) throw NotFound("todo", id);
    reply.code(204).send();
  });
};
