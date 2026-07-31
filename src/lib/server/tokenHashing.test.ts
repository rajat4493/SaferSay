import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("server token hashing hardening", () => {
  const source = readFileSync("src/lib/server/tokenHashing.ts", "utf8");

  it("fails closed for database-backed tokens without a production token secret", () => {
    expect(source).toContain("TOKEN_SECRET is required before issuing or spending database-backed respondent tokens.");
    expect(source).toContain("process.env.DATABASE_URL");
  });

  it("rejects placeholder and development token secrets", () => {
    expect(source).toContain("replace-with-a-long-random-secret");
    expect(source).toContain("local-development-token-secret");
    expect(source).toContain("process.env.TOKEN_SECRET.length >= 32");
  });
});
