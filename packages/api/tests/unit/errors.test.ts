import { describe, it, expect } from "vitest";
import { HttpError, NotFound, ValidationError } from "../../src/errors.js";

describe("HttpError", () => {
  it("captures statusCode, errorToken, errorCode and message", () => {
    const e = new HttpError(418, "teapot", "x.y", "I am a teapot");
    expect(e.statusCode).toBe(418);
    expect(e.errorToken).toBe("teapot");
    expect(e.errorCode).toBe("x.y");
    expect(e.message).toBe("I am a teapot");
  });
});

describe("NotFound", () => {
  it("builds a 404 with resource-scoped code", () => {
    const e = NotFound("todo", "abc");
    expect(e.statusCode).toBe(404);
    expect(e.errorToken).toBe("not_found");
    expect(e.errorCode).toBe("todo.not_found");
    expect(e.message).toContain("abc");
  });
});

describe("ValidationError", () => {
  it("builds a 400 with given code", () => {
    const e = ValidationError("foo.bar", "bad");
    expect(e.statusCode).toBe(400);
    expect(e.errorToken).toBe("validation_error");
    expect(e.errorCode).toBe("foo.bar");
  });
});
