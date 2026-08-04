import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeMode } from "@/lib/runtimeConfig";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import type { UserRecord, UserRole } from "@/lib/server/repositories/types";
import { localTenant, resolveTenantContext } from "@/lib/server/tenant";
import { createClient } from "@/utils/supabase/server";

export type SessionContext = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenant: { id: string; name: string; slug: string };
  isSuperAdmin: boolean;
  homeTenantId: string;
};

export const superAdminTenantCookieName = "safersay_super_admin_tenant";

const localDevContext: SessionContext = {
  userId: "local-dev",
  email: "dev@localhost",
  name: "Local dev",
  role: "owner",
  tenant: localTenant,
  isSuperAdmin: false,
  homeTenantId: localTenant.id,
};

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/**
 * The Super Admin switch is scoped to tenant/ops management only — it never
 * exempts anything from the k>=5 protected-report threshold or any other
 * severance rule. A super admin viewing another tenant sees exactly what
 * that tenant's own owner/admin would see, nothing more, and every switch
 * is logged (see IdentityRepository.logSuperAdminAccess).
 */
export function isSuperAdminEmail(email: string) {
  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/**
 * Resolves the current request's authenticated user and their tenant/role,
 * provisioning a new tenant on first sign-in when no invite exists yet.
 * Returns null when unauthenticated. Falls back to a local dev identity
 * only when Supabase isn't configured and the app isn't running in
 * production mode, so local development stays zero-config.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  if (!hasSupabaseConfig()) {
    return getRuntimeMode() === "production" ? null : localDevContext;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser?.email) return null;

  const db = getDatabasePool();
  if (!db) {
    const { tenant } = await resolveTenantContext();
    return { userId: authUser.id, email: authUser.email, name: null, role: "owner", tenant, isSuperAdmin: false, homeTenantId: tenant.id };
  }

  const repo = new IdentityRepository(db);
  const record = await resolveUserRecord(repo, authUser.id, authUser.email, authUser.user_metadata);

  const homeTenant = await repo.findTenantById(record.tenantId);
  if (!homeTenant) return null;

  const isSuperAdmin = isSuperAdminEmail(authUser.email);
  let tenant = homeTenant;

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const overrideTenantId = cookieStore.get(superAdminTenantCookieName)?.value;
    if (overrideTenantId && overrideTenantId !== homeTenant.id) {
      const overrideTenant = await repo.findTenantById(overrideTenantId);
      if (overrideTenant) tenant = overrideTenant;
    }
  }

  return { userId: authUser.id, email: record.email, name: record.name, role: record.role, tenant, isSuperAdmin, homeTenantId: homeTenant.id };
}

async function resolveUserRecord(
  repo: IdentityRepository,
  providerSubject: string,
  email: string,
  metadata: Record<string, unknown> | undefined,
): Promise<UserRecord> {
  const existing = await repo.findUserByAuthSubject("supabase", providerSubject);
  if (existing) return existing;

  const invited = await repo.findUserByEmail(email);
  if (invited) {
    await repo.linkAuthSubject(invited.id, "supabase", providerSubject);
    return { ...invited, authProvider: "supabase", providerSubject };
  }

  const displayName = typeof metadata?.full_name === "string" ? (metadata.full_name as string) : null;
  const tenant = await repo.createTenant(`${displayName ?? email}'s workspace`);
  const user = await repo.createUser({
    tenantId: tenant.id,
    authProvider: "supabase",
    providerSubject,
    email,
    name: displayName,
    role: "owner",
  });
  await repo.emitOnboardingEvent(tenant.id, user.id, "signup");
  return user;
}

export async function requireSessionContext(nextPath: string): Promise<SessionContext> {
  const context = await getSessionContext();
  if (context) return context;
  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}
