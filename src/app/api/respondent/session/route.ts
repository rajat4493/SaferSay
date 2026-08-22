import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { getRespondentSurveySession } from "@/lib/server/respondentSessionService";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";

// A dead link isn't one thing -- "you already finished this" and "this
// link doesn't exist" call for different words, not the same vague
// "not active" message. The client picks title/body copy off `reason`.
type DeadLinkReason = "already_submitted" | "revoked" | "invalid";

function deadLinkResponse(reason: DeadLinkReason) {
  const messages: Record<DeadLinkReason, string> = {
    already_submitted: "You've already completed this survey.",
    revoked: "This invite is no longer active.",
    invalid: "This link isn't valid.",
  };
  return NextResponse.json({ ok: false, error: messages[reason], reason }, { status: reason === "already_submitted" ? 409 : 404 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Survey token is required." }, { status: 400 });

  const { allowed } = await checkRateLimit(`session:${getClientIp(request)}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const adminPool = getDatabasePool();
  if (!adminPool) return NextResponse.json({ ok: false, error: "Database-backed surveys are not configured." }, { status: 503 });

  // Unfiltered lookup first, purely to tell "already submitted" apart from
  // "never existed" -- findIssuedTokenForRespondentSession (used below to
  // actually resolve the session) collapses every non-"issued" status to
  // null, which is exactly the ambiguity being fixed here.
  const tokenHash = hashServerToken(token);
  const participant = await new IdentityRepository(adminPool).findIssuedToken(tokenHash);
  if (!participant) return deadLinkResponse("invalid");
  if (participant.token_status === "spent") return deadLinkResponse("already_submitted");
  if (participant.token_status === "revoked") return deadLinkResponse("revoked");

  const tenantPool = getTenantPool();
  const session = tenantPool
    ? await withTenantContext(tenantPool, participant.tenant_id, (client) => getRespondentSurveySession({ db: client, rawToken: token }))
    : await getRespondentSurveySession({ db: adminPool, rawToken: token });

  if (!session) return deadLinkResponse("invalid");
  return NextResponse.json({ ok: true, session });
}
