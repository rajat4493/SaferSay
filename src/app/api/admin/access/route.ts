import { NextResponse, type NextRequest } from "next/server";
import { adminAccessCookieName } from "@/lib/adminAccessConstants";
import { createAdminAccessToken, hasAdminAccessSecret } from "@/lib/server/adminAccess";

export async function POST(request: NextRequest) {
  if (!hasAdminAccessSecret()) {
    return NextResponse.json({ ok: false, error: "Admin access is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { secret?: string };
  if (body.secret !== process.env.ADMIN_ACCESS_SECRET) {
    return NextResponse.json({ ok: false, error: "Invalid access code." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminAccessCookieName, createAdminAccessToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminAccessCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
