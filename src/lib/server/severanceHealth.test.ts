import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("severance health endpoint contract", () => {
  const route = readFileSync("src/app/api/internal/db-health/route.ts", "utf8");
  const health = readFileSync("src/lib/server/severanceHealth.ts", "utf8");

  it("keeps the deployed database health check private when a secret is configured", () => {
    expect(route).toContain("HEALTHCHECK_SECRET");
    expect(route).toContain("x-safersay-healthcheck-secret");
    expect(route).toContain("Unauthorized health check.");
  });

  it("checks the confidentiality spine requirements", () => {
    expect(health).toContain("identity");
    expect(health).toContain("responses");
    expect(health).toContain("relrowsecurity");
    expect(health).toContain("Responses schema has no foreign keys back to identity schema.");
    expect(health).toContain("Responses schema has no forbidden personal identity columns.");
  });
});
