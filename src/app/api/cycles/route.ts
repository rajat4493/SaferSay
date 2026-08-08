import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const cycles = await withTenantScopedDb(session.tenant.id, (db) =>
    new ResponseRepository(db).listCyclesForTenant(session.tenant.id, session.tenant.name),
  );

  return NextResponse.json({ ok: true, cycles });
}
