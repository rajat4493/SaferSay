import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!session.isSuperAdmin) return NextResponse.json({ ok: false, error: "Not a super admin." }, { status: 403 });

  const owners = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return NextResponse.json({
    ok: true,
    settings: {
      platformOwners: owners,
      runtimeMode: process.env.SAFERSAY_RUNTIME_MODE ?? "local",
      dataResidencyDefault: process.env.DATA_RESIDENCY_REGION ?? "EU",
      legalEntityName: process.env.LEGAL_ENTITY_NAME ?? null,
    },
  });
}
