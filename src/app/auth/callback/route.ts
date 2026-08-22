import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") ? next : "/app";

  // getSessionContext() (where a brand-new email auto-provisions its own
  // tenant, see authSession.ts's resolveUserRecord) takes no request/IP --
  // this callback is the one point in the real OAuth signup path where a
  // NextRequest is actually in scope, so it's where abuse-rate-limiting on
  // account/tenant creation has to live. Generous limit: this also gates
  // ordinary returning-user logins, not just new signups.
  const { allowed } = await checkRateLimit(`oauth-callback:${getClientIp(request)}`, 20, 600);
  if (!allowed) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "rate_limited");
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "oauth_failed");
  return NextResponse.redirect(url);
}
