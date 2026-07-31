import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantContext } from "@/lib/server/tenant";

export async function GET(request: NextRequest) {
  try {
    const context = await resolveTenantContext(request);
    return NextResponse.json({ ok: true, ...context });
  } catch {
    return NextResponse.json({ ok: false, error: "Tenant could not be resolved." }, { status: 400 });
  }
}
