import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { canModifyBilling } from "@/lib/permissions";
import { launchPaidCycle } from "@/lib/serverStore";

export async function POST() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canModifyBilling(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to launch a paid cycle." }, { status: 403 });
  }
  return NextResponse.json({ cycle: await launchPaidCycle() });
}
