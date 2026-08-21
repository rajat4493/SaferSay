import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext, type Queryable } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { sendSosAlert } from "@/lib/server/sosDelivery";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { checkRateLimit } from "@/lib/server/rateLimit";

/**
 * Respondent-facing (token-gated, not staff-role-gated), same as
 * /api/respondent/submit -- this route never enters responses.* and is
 * the one deliberate place a survey token resolves to a real identity,
 * only after explicit consent. See identityRepository.ts's
 * findParticipantIdentityForSos for why that's a separate method from
 * the normal severed-submission lookup.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    message?: string;
    consentAck?: boolean;
  };

  if (!body.token || !body.message?.trim()) {
    return NextResponse.json({ ok: false, error: "A message is required." }, { status: 400 });
  }
  if (body.consentAck !== true) {
    // Defense in depth -- the UI requires the checkbox before this can be
    // submitted at all, but never trust the client to have enforced it.
    return NextResponse.json({ ok: false, error: "You must acknowledge before sending." }, { status: 400 });
  }

  // Tighter than the other respondent routes -- this sends a real alert
  // to a human safety contact, so it must not be spammable.
  const rateLimit = await checkRateLimit({ request, routeKey: "respondent-sos", limit: 5, windowSeconds: 300 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const adminPool = getDatabasePool();
  if (!adminPool) {
    return NextResponse.json({ ok: false, error: "This feature isn't available right now." }, { status: 503 });
  }

  const tokenHash = hashServerToken(body.token);
  const participant = await new IdentityRepository(adminPool).findIssuedToken(tokenHash);
  if (!participant) {
    return NextResponse.json({ ok: false, error: "This link is invalid or has expired." }, { status: 400 });
  }

  const tenantPool = getTenantPool();
  const runInTenantContext = <T>(fn: (client: Queryable) => Promise<T>) =>
    tenantPool ? withTenantContext(tenantPool, participant.tenant_id, fn) : fn(adminPool);

  const result = await runInTenantContext(async (client) => {
    const repo = new IdentityRepository(client);

    // Re-check server-side even though the UI already gated on
    // sos-availability -- never trust the client-side hide as the only
    // enforcement point.
    const safetyContactEmail = await repo.getSafetyContactEmail(participant.tenant_id);
    if (!safetyContactEmail) {
      return { ok: false as const, error: "This feature isn't available for your workspace." };
    }

    const identityInfo = await repo.findParticipantIdentityForSos(tokenHash);
    if (!identityInfo) {
      return { ok: false as const, error: "This link is invalid or has expired." };
    }

    const tenant = await repo.findTenantById(identityInfo.tenant_id);
    if (!tenant) {
      return { ok: false as const, error: "This link is invalid or has expired." };
    }

    const { id: reportId } = await repo.createSosReport({
      tenantId: identityInfo.tenant_id,
      cycleId: identityInfo.cycle_id,
      employeeId: identityInfo.employee_id,
      message: body.message!.trim(),
      routedToEmail: safetyContactEmail,
    });

    const delivery = await sendSosAlert({
      tenant,
      safetyContactEmail,
      message: body.message!.trim(),
      respondentContext: { name: identityInfo.employee_name, email: identityInfo.employee_email },
    });
    await repo.markSosReportEmailStatus(reportId, delivery.sent ? "sent" : "failed");

    // Never echo the safety contact's email/identity or delivery detail
    // back to the browser -- the respondent doesn't need to know more
    // than "it was sent."
    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
