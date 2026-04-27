import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startTestApp, type TestApp } from "../helpers/test-app.js";
import { todos } from "../../src/db/schema.js";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
}, 120_000);

afterAll(async () => {
  await ctx?.cleanup();
});

beforeEach(async () => {
  await ctx.db.delete(todos);
});

describe("GET /todos", () => {
  it("returns an empty array when there are no todos", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/todos" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("returns todos newest-first", async () => {
    await ctx.db.insert(todos).values([
      { text: "older", createdAt: new Date("2026-01-01T00:00:00Z") },
      { text: "newer", createdAt: new Date("2026-04-01T00:00:00Z") },
    ]);
    const res = await ctx.app.inject({ method: "GET", url: "/todos" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ text: string }>;
    expect(body.map((t) => t.text)).toEqual(["newer", "older"]);
  });

  it("includes the request id in the response header", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/todos" });
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});

describe("POST /todos", () => {
  it("creates a todo and returns 201", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/todos",
      payload: { text: "buy milk" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { id: string; text: string; completed: boolean; createdAt: string };
    expect(body.text).toBe("buy milk");
    expect(body.completed).toBe(false);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("trims whitespace from text", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/todos",
      payload: { text: "   trim me   " },
    });
    expect(res.statusCode).toBe(201);
    expect((res.json() as { text: string }).text).toBe("trim me");
  });

  it("rejects empty text with 400", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/todos",
      payload: { text: "" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string; code: string };
    expect(body.error).toBe("validation_error");
    expect(body.code).toBe("request.invalid");
  });

  it("rejects whitespace-only text with 400", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/todos",
      payload: { text: "    " },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects text over 500 chars with 400", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/todos",
      payload: { text: "a".repeat(501) },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects missing text with 400", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/todos",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("PATCH /todos/:id", () => {
  it("toggles a todo to completed", async () => {
    const created = await ctx.db
      .insert(todos)
      .values({ text: "task" })
      .returning();
    const id = created[0]!.id;
    const res = await ctx.app.inject({
      method: "PATCH",
      url: `/todos/${id}`,
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { completed: boolean }).completed).toBe(true);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await ctx.app.inject({
      method: "PATCH",
      url: "/todos/00000000-0000-0000-0000-000000000000",
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: string }).error).toBe("not_found");
  });

  it("returns 400 for an invalid uuid", async () => {
    const res = await ctx.app.inject({
      method: "PATCH",
      url: "/todos/not-a-uuid",
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when completed is missing", async () => {
    const created = await ctx.db.insert(todos).values({ text: "task" }).returning();
    const res = await ctx.app.inject({
      method: "PATCH",
      url: `/todos/${created[0]!.id}`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("DELETE /todos/:id", () => {
  it("deletes a todo and returns 204", async () => {
    const created = await ctx.db.insert(todos).values({ text: "task" }).returning();
    const id = created[0]!.id;
    const res = await ctx.app.inject({ method: "DELETE", url: `/todos/${id}` });
    expect(res.statusCode).toBe(204);
    const list = await ctx.app.inject({ method: "GET", url: "/todos" });
    expect(list.json()).toEqual([]);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await ctx.app.inject({
      method: "DELETE",
      url: "/todos/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for an invalid uuid", async () => {
    const res = await ctx.app.inject({ method: "DELETE", url: "/todos/not-a-uuid" });
    expect(res.statusCode).toBe(400);
  });
});

describe("unknown routes", () => {
  it("returns 404 with the error envelope", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: string }).error).toBe("not_found");
  });
});
