import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { logAuditEvent } from "@/lib/server/auditLog";
import { sendPublicCommitmentUpdate } from "@/lib/server/resendDelivery";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

async function requireCustomerAdmin() {
  const session = await getSessionContext();
  if (!session) return { error: "Unauthorized." as const };
  if (isPlatformOwnerImpersonating(session) || session.role !== "customer_admin") {
    return { error: "Only the workspace owner can publish or update a commitment." as const };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  const auth = await requireCustomerAdmin();
  if ("error" in auth) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  const cycleId = request.nextUrl.searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ ok: false, error: "cycleId is required." }, { status: 400 });
  const commitments = await withTenantScopedDb(auth.session.tenant.id, (db) =>
    new IdentityRepository(db).listCycleCommitments(auth.session.tenant.id, cycleId),
  );
  return NextResponse.json({ ok: true, commitments });
}

export async function POST(request: NextRequest) {
  const auth = await requireCustomerAdmin();
  if ("error" in auth) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; statement?: string; targetDate?: string; sendUpdate?: boolean };
  const statement = body.statement?.trim();
  if (!body.cycleId || !statement || statement.length > 500 || !isIsoDate(body.targetDate)) {
    return NextResponse.json({ ok: false, error: "Provide a commitment of up to 500 characters and a valid target date." }, { status: 400 });
  }

  const committed = await withTenantScopedDb(auth.session.tenant.id, async (db) => {
    const responses = new ResponseRepository(db);
    const cycle = await responses.getCycleForTenant(auth.session.tenant.id, body.cycleId!);
    if (!cycle) return { error: "Survey not found." as const };
    const report = await responses.getProtectedReportForTenant(auth.session.tenant.id, cycle.id, cycle.minGroupSize);
    if (report.protected) return { error: "Publish a commitment only after the protected report has unlocked." as const };
    const identity = new IdentityRepository(db);
    const commitment = await identity.publishCycleCommitment(auth.session.tenant.id, cycle.id, statement, body.targetDate!);
    const recipients = body.sendUpdate === false ? [] : await identity.listCycleCommitmentRecipients(auth.session.tenant.id, cycle.id);
    return { commitment, recipients };
  });
  if ("error" in committed) return NextResponse.json({ ok: false, error: committed.error }, { status: 400 });

  const delivery = committed.recipients.length
    ? await sendPublicCommitmentUpdate({ tenant: auth.session.tenant, recipients: committed.recipients, statement, targetDate: body.targetDate! })
    : { sent: 0, failed: 0, errors: [] };
  await logAuditEvent({ tenantId: auth.session.tenant.id, actorRole: auth.session.role, actorId: auth.session.email, action: "commitment_published", targetType: "survey", targetId: body.cycleId });
  // Keep individual delivery errors (which may contain an email address) on
  // the server. A commitment update is an aggregate operation, not a new
  // channel for exposing employee-level delivery information.
  return NextResponse.json({ ok: true, commitment: committed.commitment, delivery: { sent: delivery.sent, failed: delivery.failed } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCustomerAdmin();
  if ("error" in auth) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; status?: "in_progress" | "completed"; progressUpdate?: string };
  if (!body.cycleId || (body.status !== "in_progress" && body.status !== "completed") || (body.progressUpdate?.length ?? 0) > 500) {
    return NextResponse.json({ ok: false, error: "Provide a commitment status and an update of up to 500 characters." }, { status: 400 });
  }
  const commitment = await withTenantScopedDb(auth.session.tenant.id, (db) =>
    new IdentityRepository(db).updateCycleCommitment(auth.session.tenant.id, body.cycleId!, body.status!, body.progressUpdate?.trim() ?? ""),
  );
  if (!commitment) return NextResponse.json({ ok: false, error: "No published commitment was found for this survey." }, { status: 404 });
  await logAuditEvent({ tenantId: auth.session.tenant.id, actorRole: auth.session.role, actorId: auth.session.email, action: "commitment_updated", targetType: "survey", targetId: body.cycleId });
  return NextResponse.json({ ok: true, commitment });
}
