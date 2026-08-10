import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { canModifyBilling } from "@/lib/permissions";
import { createCycleCheckout } from "@/lib/paymentService";
import { getDefaultCycle, markCyclePaid } from "@/lib/serverStore";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canModifyBilling(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to manage billing." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { mockSuccess?: boolean; cycleId?: string };
  const cycleId = body.cycleId ?? getDefaultCycle().id;

  if (body.mockSuccess) {
    return NextResponse.json({ cycle: await markCyclePaid(cycleId) });
  }

  const checkout = await createCycleCheckout(request.nextUrl.origin, cycleId);
  return NextResponse.json(checkout);
}
