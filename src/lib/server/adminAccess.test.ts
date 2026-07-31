import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("temporary admin access gate", () => {
  it("protects app and viewer routes in middleware", () => {
    const middleware = readFileSync("middleware.ts", "utf8");
    expect(middleware).toContain("isProtectedAdminPath");
    expect(middleware).toContain('pathname === "/app"');
    expect(middleware).toContain('pathname === "/viewer"');
    expect(middleware).toContain('url.pathname = "/login"');
  });

  it("sets an httpOnly admin access cookie from the access route", () => {
    const route = readFileSync("src/app/api/admin/access/route.ts", "utf8");
    expect(route).toContain("httpOnly: true");
    expect(route).toContain('sameSite: "lax"');
    expect(route).toContain("ADMIN_ACCESS_SECRET");
  });
});
