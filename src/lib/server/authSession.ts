import "server-only";
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
};

const localDevContext: SessionContext = {
  userId: "local-dev",
  email: "dev@localhost",
  name: "Local dev",
  role: "owner",
  tenant: localTenant,
};

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
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
    return { userId: authUser.id, email: authUser.email, name: null, role: "owner", tenant };
  }

  const repo = new IdentityRepository(db);
  const record = await resolveUserRecord(repo, authUser.id, authUser.email, authUser.user_metadata);

  const tenant = await repo.findTenantById(record.tenantId);
  if (!tenant) return null;

  return { userId: authUser.id, email: record.email, name: record.name, role: record.role, tenant };
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
  return repo.createUser({
    tenantId: tenant.id,
    authProvider: "supabase",
    providerSubject,
    email,
    name: displayName,
    role: "owner",
  });
}

export async function requireSessionContext(nextPath: string): Promise<SessionContext> {
  const context = await getSessionContext();
  if (context) return context;
  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}
