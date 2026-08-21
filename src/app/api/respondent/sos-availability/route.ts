import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { checkRateLimit } from "@/lib/server/rateLimit";

/**
 * Tells the respondent UI whether to render the SOS button at all. This is
 * the enforcement point for "hidden entirely, never a fallback contact" --
 * available is only ever true when a tenant has explicitly set a safety
 * contact (see 0023_sos_reports.sql). The POST route re-checks this
 * server-side too -- never trust the client-side hide as the only gate.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token is required." }, { status: 400 });
  }

  const rateLimit = await checkRateLimit({ request, routeKey: "respondent-sos-availability", limit: 30, windowSeconds: 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a moment and try again." }, { status: 429 });
  }

  const adminPool = getDatabasePool();
  if (!adminPool) {
    // No database configured (local in-memory mode) -- SOS has nothing to
    // route to, same "not available" as an unconfigured tenant.
    return NextResponse.json({ ok: true, available: false });
  }

  const tokenHash = hashServerToken(token);
  const participant = await new IdentityRepository(adminPool).findIssuedToken(tokenHash);
  if (!participant) {
    return NextResponse.json({ ok: true, available: false });
  }

  const tenantPool = getTenantPool();
  const safetyContactEmail = tenantPool
    ? await withTenantContext(tenantPool, participant.tenant_id, (client) =>
        new IdentityRepository(client).getSafetyContactEmail(participant.tenant_id),
      )
    : await new IdentityRepository(adminPool).getSafetyContactEmail(participant.tenant_id);

  return NextResponse.json({ ok: true, available: Boolean(safetyContactEmail) });
}
