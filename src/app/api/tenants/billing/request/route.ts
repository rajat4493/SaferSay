import { NextResponse, type NextRequest } from "next/server";
import { surveyCreditPacks, retentionPlans } from "@/lib/billingCatalog";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { creditPackId?: string; retentionPlanId?: string };
  const creditPack = surveyCreditPacks.find((pack) => pack.id === body.creditPackId);
  const retentionPlan = retentionPlans.find((plan) => plan.id === body.retentionPlanId);

  if (!creditPack && !retentionPlan) {
    return NextResponse.json({ ok: false, error: "Choose a credit pack or retention option." }, { status: 400 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "Billing requests are not configured locally." }, { status: 503 });

  const parts = [
    creditPack ? `Credit request: ${creditPack.name} (${creditPack.credits} credits, ${creditPack.price})` : null,
    retentionPlan ? `Retention request: ${retentionPlan.name} (${retentionPlan.price})` : null,
  ].filter(Boolean);
  await new IdentityRepository(db).addSupportNote(session.tenant.id, session.email, `Billing upgrade request. ${parts.join("; ")}.`);

  return NextResponse.json({ ok: true });
}
