import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canModifySettings } from "@/lib/permissions";
import { defaultBrand, type BrandTheme } from "@/lib/brand";
import { isValidHexColor } from "@/lib/brandTheme";
import { findBrandPreset } from "@/lib/brandPresets";

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const brand = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getBrand(session.tenant.id));
  return NextResponse.json({ ok: true, brand: brand ?? defaultBrand });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to change workspace branding." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<BrandTheme>;
  if (typeof body.accentColor === "string" && body.accentColor && !isValidHexColor(body.accentColor)) {
    return NextResponse.json({ ok: false, error: "Accent color must be a 6-digit hex value like #0d4f37." }, { status: 400 });
  }
  if (typeof body.presetId === "string" && body.presetId && !findBrandPreset(body.presetId)) {
    return NextResponse.json({ ok: false, error: "Unknown brand preset." }, { status: 400 });
  }

  const brand: BrandTheme = {
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : defaultBrand.name,
    tagline: typeof body.tagline === "string" ? body.tagline : defaultBrand.tagline,
    logoDataUrl: typeof body.logoDataUrl === "string" ? body.logoDataUrl : null,
    accentColor: typeof body.accentColor === "string" && body.accentColor ? body.accentColor : null,
    fontFamily: typeof body.fontFamily === "string" && body.fontFamily ? body.fontFamily : null,
    presetId: typeof body.presetId === "string" && body.presetId ? body.presetId : null,
  };

  await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).setBrand(session.tenant.id, brand));
  return NextResponse.json({ ok: true, brand });
}
