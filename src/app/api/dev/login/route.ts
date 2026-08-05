import { NextResponse, type NextRequest } from "next/server";
import { devAuthCookieName, isDevAuthAllowed } from "@/lib/server/devAuth";

export async function GET() {
  if (!isDevAuthAllowed()) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  if (!isDevAuthAllowed()) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(devAuthCookieName, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(devAuthCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
