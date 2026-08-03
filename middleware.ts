import { type NextRequest, NextResponse } from "next/server";
import { getRuntimeMode } from "@/lib/runtimeConfig";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (isProtectedAdminPath(request.nextUrl.pathname) && !user && !allowUnauthenticatedDevAccess()) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

function isProtectedAdminPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname === "/viewer" || pathname.startsWith("/viewer/");
}

function allowUnauthenticatedDevAccess() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return getRuntimeMode() !== "production" && !supabaseConfigured;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
