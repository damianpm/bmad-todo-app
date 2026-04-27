import { describe, it, expect } from "vitest";
import { loadEnv } from "../../src/env.js";

describe("loadEnv", () => {
  it("parses a complete environment", () => {
    const env = loadEnv({
      DATABASE_URL: "postgres://u:p@localhost:5432/db",
      PORT: "4000",
      LOG_LEVEL: "debug",
      CORS_ORIGIN: "http://example.com",
      NODE_ENV: "production",
    });
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe("debug");
    expect(env.NODE_ENV).toBe("production");
  });

  it("applies defaults for optional vars", () => {
    const env = loadEnv({ DATABASE_URL: "postgres://u:p@localhost:5432/db" });
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.CORS_ORIGIN).toBe("http://localhost:8080");
    expect(env.NODE_ENV).toBe("development");
  });

  it("throws on missing DATABASE_URL", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it("throws on invalid DATABASE_URL", () => {
    expect(() => loadEnv({ DATABASE_URL: "not-a-url" })).toThrow(/invalid environment/);
  });

  it("throws on invalid LOG_LEVEL", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "postgres://u:p@localhost:5432/db",
        LOG_LEVEL: "verbose",
      }),
    ).toThrow(/invalid environment/);
  });
});
