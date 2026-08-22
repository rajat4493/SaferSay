import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("signup/login abuse rate limiting", () => {
  const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");
  const devLogin = readFileSync("src/app/api/dev/login/route.ts", "utf8");

  it("real OAuth callback checks a rate limit before exchanging the code", () => {
    const rateLimitIndex = callback.indexOf("checkRateLimit(");
    const exchangeIndex = callback.indexOf("exchangeCodeForSession");
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeLessThan(exchangeIndex);
  });

  it("dev-login route also rate-limits, for parity in local/preview environments", () => {
    expect(devLogin).toContain("checkRateLimit(");
    expect(devLogin).toContain("429");
  });
});
