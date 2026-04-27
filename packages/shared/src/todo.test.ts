import { describe, it, expect } from "vitest";
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  ApiErrorSchema,
  HealthSchema,
} from "./todo.js";

describe("TodoSchema", () => {
  it("accepts a valid todo", () => {
    const result = TodoSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      text: "Buy milk",
      completed: false,
      createdAt: "2026-04-27T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = TodoSchema.safeParse({
      id: "not-a-uuid",
      text: "x",
      completed: false,
      createdAt: "2026-04-27T10:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty text", () => {
    const result = TodoSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      text: "",
      completed: false,
      createdAt: "2026-04-27T10:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects text longer than 500 chars", () => {
    const result = TodoSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      text: "a".repeat(501),
      completed: false,
      createdAt: "2026-04-27T10:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateTodoSchema", () => {
  it("trims whitespace", () => {
    const result = CreateTodoSchema.parse({ text: "  hello  " });
    expect(result.text).toBe("hello");
  });

  it("rejects whitespace-only text", () => {
    const result = CreateTodoSchema.safeParse({ text: "   " });
    expect(result.success).toBe(false);
  });

  it("accepts text at the 500 char boundary", () => {
    const result = CreateTodoSchema.safeParse({ text: "a".repeat(500) });
    expect(result.success).toBe(true);
  });
});

describe("UpdateTodoSchema", () => {
  it("accepts a boolean", () => {
    expect(UpdateTodoSchema.safeParse({ completed: true }).success).toBe(true);
  });

  it("rejects missing completed", () => {
    expect(UpdateTodoSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-boolean", () => {
    expect(UpdateTodoSchema.safeParse({ completed: "yes" }).success).toBe(false);
  });
});

describe("ApiErrorSchema", () => {
  it("requires error, message, and code", () => {
    expect(
      ApiErrorSchema.safeParse({
        error: "validation_error",
        message: "Text is required",
        code: "todo.text.required",
      }).success,
    ).toBe(true);
  });
});

describe("HealthSchema", () => {
  it("accepts ok+ok", () => {
    expect(HealthSchema.safeParse({ status: "ok", db: "ok" }).success).toBe(true);
  });

  it("accepts ok+down", () => {
    expect(HealthSchema.safeParse({ status: "ok", db: "down" }).success).toBe(true);
  });

  it("rejects bad status", () => {
    expect(HealthSchema.safeParse({ status: "bad", db: "ok" }).success).toBe(false);
  });
});
