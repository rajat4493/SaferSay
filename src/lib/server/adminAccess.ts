import { createHmac, timingSafeEqual } from "crypto";
import { adminAccessMessage } from "@/lib/adminAccessConstants";

export function hasAdminAccessSecret() {
  return Boolean(process.env.ADMIN_ACCESS_SECRET && process.env.ADMIN_ACCESS_SECRET.length >= 32);
}

export function requireAdminAccessSecret() {
  if (!hasAdminAccessSecret()) {
    throw new Error("ADMIN_ACCESS_SECRET must be configured before protecting admin routes.");
  }
  return process.env.ADMIN_ACCESS_SECRET!;
}

export function createAdminAccessToken() {
  return createHmac("sha256", requireAdminAccessSecret()).update(adminAccessMessage).digest("base64url");
}

export function verifyAdminAccessToken(token: string | undefined) {
  if (!token || !hasAdminAccessSecret()) return false;
  const expected = createAdminAccessToken();
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}
