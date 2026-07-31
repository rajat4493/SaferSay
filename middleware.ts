import { type NextRequest, NextResponse } from "next/server";
import { adminAccessCookieName, adminAccessMessage } from "@/lib/adminAccessConstants";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (isProtectedAdminPath(request.nextUrl.pathname)) {
    const hasAccess = await verifyAdminAccessCookie(request);
    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return updateSession(request);
}

function isProtectedAdminPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname === "/viewer" || pathname.startsWith("/viewer/");
}

async function verifyAdminAccessCookie(request: NextRequest) {
  const secret = process.env.ADMIN_ACCESS_SECRET;
  if (!secret || secret.length < 32) return process.env.SAFERSAY_RUNTIME_MODE !== "production";

  const token = request.cookies.get(adminAccessCookieName)?.value;
  if (!token) return false;

  const expected = await createAdminAccessToken(secret);
  return token === expected;
}

async function createAdminAccessToken(secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(adminAccessMessage));
  return base64Url(signature);
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
