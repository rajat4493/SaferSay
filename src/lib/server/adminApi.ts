import type { NextRequest } from "next/server";
import { adminAccessCookieName } from "@/lib/adminAccessConstants";
import { verifyAdminAccessToken } from "@/lib/server/adminAccess";

export function hasAdminApiAccess(request: NextRequest) {
  return verifyAdminAccessToken(request.cookies.get(adminAccessCookieName)?.value);
}
