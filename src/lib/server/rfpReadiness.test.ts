import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";

describe("legal pages", () => {
  it("privacy page is no longer a placeholder", () => {
    const source = readFileSync("src/app/privacy/page.tsx", "utf8");
    expect(source).not.toContain("Privacy Notice Placeholder");
    expect(source).toContain("Sub-processors");
  });

  it("DPA page is no longer a placeholder", () => {
    const source = readFileSync("src/app/dpa/page.tsx", "utf8");
    expect(source).not.toContain("Data Processing Agreement Placeholder");
    expect(source).toContain("Sub-processors");
  });

  it("both pages are honest about not yet having final legal review, rather than presenting as fully binding", () => {
    const privacy = readFileSync("src/app/privacy/page.tsx", "utf8");
    const dpa = readFileSync("src/app/dpa/page.tsx", "utf8");
    expect(privacy).toMatch(/legal (counsel|review)/i);
    expect(dpa).toMatch(/legal (counsel|review)/i);
  });
});

describe("security.txt", () => {
  it("exists at the RFC 9116 well-known path", () => {
    expect(existsSync("public/.well-known/security.txt")).toBe(true);
  });

  it("has a Contact and a future Expires field", () => {
    const source = readFileSync("public/.well-known/security.txt", "utf8");
    expect(source).toMatch(/^Contact:/m);
    expect(source).toMatch(/^Expires:/m);
  });
});

describe("status endpoint", () => {
  it("never exposes schema/column names, unlike /api/internal/db-health", () => {
    const source = readFileSync("src/app/api/status/route.ts", "utf8");
    expect(source).not.toContain("information_schema");
    expect(source).not.toContain("runSeveranceHealthCheck");
  });
});

describe("data export and deletion request", () => {
  it("export route excludes raw response answers -- only roster/config data", () => {
    const source = readFileSync("src/app/api/tenants/export/route.ts", "utf8");
    expect(source).not.toContain("getProtectedReportForTenant");
    expect(source).not.toContain("responses.answers");
  });

  it("deletion-request route logs the request but never executes deletion itself", () => {
    const source = readFileSync("src/app/api/tenants/deletion-request/route.ts", "utf8");
    expect(source).not.toMatch(/delete from|drop table|truncate/i);
    expect(source).toContain("logDeletionRequested");
  });
});
