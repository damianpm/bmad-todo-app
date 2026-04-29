import { describe, it, expect } from "vitest";
import { redactSecrets } from "../../src/log-redact.js";

describe("redactSecrets", () => {
  it("masks the password in a postgres URL", () => {
    expect(redactSecrets("connect to postgres://user:s3cr3t@db:5432/x failed")).toBe(
      "connect to postgres://user:****@db:5432/x failed",
    );
  });

  it("masks postgresql:// scheme", () => {
    expect(redactSecrets("postgresql://app:p@host/d")).toBe("postgresql://app:****@host/d");
  });

  it("masks every connection string in the message", () => {
    const input =
      "primary postgres://a:1@h1/d unreachable; fallback postgres://b:2@h2/d also down";
    expect(redactSecrets(input)).toBe(
      "primary postgres://a:****@h1/d unreachable; fallback postgres://b:****@h2/d also down",
    );
  });

  it("leaves messages without a connection string untouched", () => {
    expect(redactSecrets("just a regular error")).toBe("just a regular error");
  });

  it("does not mask URLs that lack a userinfo section", () => {
    expect(redactSecrets("postgres://host:5432/db")).toBe("postgres://host:5432/db");
  });
});
