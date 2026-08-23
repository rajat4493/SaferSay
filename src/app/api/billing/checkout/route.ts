import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { createCreditCheckout, createRetentionCheckout, type CreditPackId } from "@/lib/paymentService";
import type { RetentionPlan } from "@/lib/billingCatalog";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    purchaseType?: "survey_credits" | "report_retention";
    creditPackId?: CreditPackId;
    retentionPlanId?: RetentionPlan;
  };

  try {
    if (body.purchaseType === "survey_credits" && body.creditPackId) {
      const checkout = await createCreditCheckout({
        origin: request.nextUrl.origin,
        tenantId: session.tenant.id,
        tenantName: session.tenant.name,
        packId: body.creditPackId,
      });
      return NextResponse.json({ ok: true, ...checkout });
    }

    if (body.purchaseType === "report_retention" && body.retentionPlanId && body.retentionPlanId !== "none") {
      const checkout = await createRetentionCheckout({
        origin: request.nextUrl.origin,
        tenantId: session.tenant.id,
        tenantName: session.tenant.name,
        planId: body.retentionPlanId,
      });
      return NextResponse.json({ ok: true, ...checkout });
    }

    return NextResponse.json({ ok: false, error: "Choose a valid billing option." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Checkout could not be created." },
      { status: 503 },
    );
  }
}
