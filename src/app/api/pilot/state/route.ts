import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getPilotState } from "@/lib/server/pilotStateService";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized pilot state access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const { tenant } = session;
  return NextResponse.json({ ok: true, tenant, ...(await getPilotState({ db, tenantId: tenant.id })) });
}
