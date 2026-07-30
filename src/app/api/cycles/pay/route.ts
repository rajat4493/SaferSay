import { NextRequest, NextResponse } from "next/server";
import { createCycleCheckout } from "@/lib/paymentService";
import { getDefaultCycle, markCyclePaid } from "@/lib/serverStore";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { mockSuccess?: boolean; cycleId?: string };
  const cycleId = body.cycleId ?? getDefaultCycle().id;

  if (body.mockSuccess) {
    return NextResponse.json({ cycle: await markCyclePaid(cycleId) });
  }

  const checkout = await createCycleCheckout(request.nextUrl.origin, cycleId);
  return NextResponse.json(checkout);
}
