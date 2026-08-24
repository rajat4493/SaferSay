import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

async function requireOwner() {
  const session = await getSessionContext();
  if (!session) return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  if (!session.isSuperAdmin) return { error: NextResponse.json({ ok: false, error: "Not a super admin." }, { status: 403 }) };
  const db = getDatabasePool();
  if (!db) return { error: NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 }) };
  return { session, repo: new IdentityRepository(db) };
}

/**
 * Creates real, spendable survey-credit ledger entries for a support,
 * pilot, or comped-customer case. This deliberately does not edit the
 * displayed balance: the ledger remains the source of truth.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireOwner();
  if ("error" in gate) return gate.error;
  const { id: tenantId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { count?: unknown };
  const count = typeof body.count === "number" ? body.count : Number(body.count);
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) {
    return NextResponse.json({ ok: false, error: "Grant between 1 and 100 credits." }, { status: 400 });
  }

  const tenant = await gate.repo.findTenantById(tenantId);
  if (!tenant) return NextResponse.json({ ok: false, error: "Tenant not found." }, { status: 404 });

  const sourceReference = `admin:${gate.session.userId}:${randomUUID()}`;
  const granted = await gate.repo.grantSurveyCredits(tenantId, count, sourceReference);
  await gate.repo.addSupportNote(tenantId, gate.session.email, `Granted ${granted} survey credit${granted === 1 ? "" : "s"} for support/pilot use.`);
  await gate.repo.logSuperAdminAccess(gate.session.userId, gate.session.email, tenantId);
  const availableCredits = await gate.repo.listAvailableSurveyCredits(tenantId);

  return NextResponse.json({ ok: true, granted, availableCredits: availableCredits.length });
}
