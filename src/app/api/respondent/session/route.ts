import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { getRespondentSurveySession } from "@/lib/server/respondentSessionService";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Survey token is required." }, { status: 400 });

  const adminPool = getDatabasePool();
  if (!adminPool) return NextResponse.json({ ok: false, error: "Database-backed surveys are not configured." }, { status: 503 });

  const tenantPool = getTenantPool();
  if (!tenantPool) {
    const session = await getRespondentSurveySession({ db: adminPool, rawToken: token });
    if (!session) return NextResponse.json({ ok: false, error: "This survey link is not active." }, { status: 404 });
    return NextResponse.json({ ok: true, session });
  }

  // The token itself is the only credential a respondent presents -- who it
  // belongs to (and therefore which tenant's RLS context to use) can only
  // be resolved via a cross-tenant lookup on the privileged connection.
  // Everything after that resolves inside the tenant-scoped context.
  const tokenHash = hashServerToken(token);
  const participant = await new IdentityRepository(adminPool).findIssuedTokenForRespondentSession(tokenHash);
  if (!participant) return NextResponse.json({ ok: false, error: "This survey link is not active." }, { status: 404 });

  const session = await withTenantContext(tenantPool, participant.tenant_id, (client) =>
    getRespondentSurveySession({ db: client, rawToken: token }),
  );
  if (!session) return NextResponse.json({ ok: false, error: "This survey link is not active." }, { status: 404 });
  return NextResponse.json({ ok: true, session });
}
