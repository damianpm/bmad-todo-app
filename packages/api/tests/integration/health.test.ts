import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startTestApp, type TestApp } from "../helpers/test-app.js";

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
}, 120_000);

afterAll(async () => {
  await ctx?.cleanup();
});

describe("GET /healthz", () => {
  it("returns ok when DB is reachable", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", db: "ok" });
  });

  it("returns db: down when the pool is broken", async () => {
    await ctx.pool.end();
    const res = await ctx.app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", db: "down" });
  });
});
