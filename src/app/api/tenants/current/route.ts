import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, tenant: session.tenant, source: "session" });
}
