import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import type { BillingTerms } from "@/lib/billingCatalog";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import type { TenantPlanTier } from "@/lib/server/repositories/types";

async function requireOwner() {
  const session = await getSessionContext();
  if (!session) return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  if (!session.isSuperAdmin) return { error: NextResponse.json({ ok: false, error: "Not a super admin." }, { status: 403 }) };
  const db = getDatabasePool();
  if (!db) return { error: NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 }) };
  return { session, repo: new IdentityRepository(db) };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireOwner();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;

  const detail = await gate.repo.getTenantDetail(id);
  if (!detail) return NextResponse.json({ ok: false, error: "Tenant not found." }, { status: 404 });
  return NextResponse.json({ ok: true, tenant: detail });
}

const validPlanTiers: TenantPlanTier[] = ["standard", "growth", "enterprise"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireOwner();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;

  const body = (await request.json().catch(() => ({}))) as {
    planTier?: string;
    features?: Record<string, boolean>;
    billingTerms?: BillingTerms;
    minGroupSize?: number;
    note?: string;
  };

  const existing = await gate.repo.getTenantDetail(id);
  if (!existing) return NextResponse.json({ ok: false, error: "Tenant not found." }, { status: 404 });

  if (body.planTier !== undefined || body.features !== undefined || body.billingTerms !== undefined) {
    const planTier = body.planTier && validPlanTiers.includes(body.planTier as TenantPlanTier)
      ? (body.planTier as TenantPlanTier)
      : existing.planTier;
    // The credit ledger is authoritative. This general tenant-settings
    // endpoint must never manufacture a display-only balance that cannot be
    // spent (or conceal the actual balance); a future manual adjustment needs
    // its own audited ledger event.
    const availableCredits = await gate.repo.listAvailableSurveyCredits(id);
    const billingTerms = { ...(body.billingTerms ?? existing.billingTerms), surveyCredits: availableCredits.length };
    await gate.repo.updateTenantPlan(id, planTier, body.features ?? existing.features, billingTerms);
  }

  if (typeof body.minGroupSize === "number") {
    await gate.repo.setMinGroupSize(id, body.minGroupSize);
  }

  if (typeof body.note === "string" && body.note.trim()) {
    await gate.repo.addSupportNote(id, gate.session.email, body.note.trim());
  }

  const updated = await gate.repo.getTenantDetail(id);
  return NextResponse.json({ ok: true, tenant: updated });
}
