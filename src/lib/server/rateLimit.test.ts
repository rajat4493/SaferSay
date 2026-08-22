import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("rate_limits migration", () => {
  const migration = readFileSync("db/migrations/0028_rate_limits.sql", "utf8");

  it("is not RLS-protected -- an internal control-plane table, keyed by token/IP not tenant", () => {
    expect(migration).not.toContain("enable row level security");
    expect(migration).not.toContain("tenant_id");
  });

  it("has a primary key on bucket_key so upserts are atomic per key", () => {
    expect(migration).toContain("bucket_key text primary key");
  });
});

describe("checkRateLimit", () => {
  const source = readFileSync("src/lib/server/rateLimit.ts", "utf8");

  it("fails open when the database is unreachable, rather than blocking every request", () => {
    const catchIndex = source.indexOf("} catch {");
    const bodyEnd = source.indexOf("}", source.indexOf("allowed: true, count: 0", catchIndex)) + 1;
    const catchBlock = source.slice(catchIndex, bodyEnd);
    expect(catchBlock).toContain("allowed: true");
  });

  it("resets the count once the window has elapsed, not just incrementing forever", () => {
    expect(source).toContain("then 1");
  });
});

describe("respondent submit rate limiting", () => {
  const route = readFileSync("src/app/api/respondent/submit/route.ts", "utf8");

  it("checks the rate limit before touching the database", () => {
    const limitIndex = route.indexOf("checkRateLimit(");
    const dbIndex = route.indexOf("getDatabasePool()");
    expect(limitIndex).toBeGreaterThan(-1);
    expect(limitIndex).toBeLessThan(dbIndex);
  });

  it("returns 429 when exceeded", () => {
    expect(route).toContain("429");
  });
});

describe("SOS rate limiting", () => {
  const route = readFileSync("src/app/api/respondent/sos/route.ts", "utf8");

  it("limits both by IP and by the token itself, before any DB lookup", () => {
    expect(route).toContain("sos-ip:");
    expect(route).toContain("sos-token:");
    const limitIndex = route.indexOf("checkRateLimit(");
    const findTokenIndex = route.indexOf("findIssuedToken(tokenHash)");
    expect(limitIndex).toBeLessThan(findTokenIndex);
  });
});
