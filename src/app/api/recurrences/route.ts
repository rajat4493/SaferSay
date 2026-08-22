import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canCreateSurvey } from "@/lib/permissions";
import { surveyTemplates } from "@/lib/templates";

const INTERVALS = ["weekly", "monthly", "quarterly"] as const;

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const recurrences = await withTenantScopedDb(session.tenant.id, (db) => new ResponseRepository(db).listRecurrencesForTenant(session.tenant.id));
  return NextResponse.json({ ok: true, recurrences });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canCreateSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to schedule surveys." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { templateSlug?: string; interval?: string; autoSend?: boolean };
  const templateSlug = body.templateSlug;
  if (!templateSlug || !surveyTemplates.some((template) => template.slug === templateSlug)) {
    return NextResponse.json({ ok: false, error: "Choose a valid survey template." }, { status: 400 });
  }
  if (!INTERVALS.includes(body.interval as (typeof INTERVALS)[number])) {
    return NextResponse.json({ ok: false, error: "Choose weekly, monthly, or quarterly." }, { status: 400 });
  }

  const recurrence = await withTenantScopedDb(session.tenant.id, (db) =>
    new ResponseRepository(db).createRecurrence({
      tenantId: session.tenant.id,
      templateSlug,
      interval: body.interval as (typeof INTERVALS)[number],
      autoSend: Boolean(body.autoSend),
    }),
  );

  return NextResponse.json({ ok: true, recurrence });
}
