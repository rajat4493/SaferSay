import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/server/rateLimit";

describe("checkRateLimit", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("fails open when no database is configured, rather than blocking respondents", async () => {
    const request = new NextRequest("http://localhost/api/respondent/session?token=abc");
    const result = await checkRateLimit({ request, routeKey: "test-route", limit: 1, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
  });
});
