"use client";

import { useTenantSessionContext } from "@/components/TenantSessionProvider";
import type { UserRole } from "@/lib/server/repositories/types";

export type TenantSessionInfo = {
  role: UserRole;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  tenantName: string;
  userEmail: string;
  userName: string | null;
  /** True once the workspace has launched its first survey. Used only to
   * keep first-run education out of established workspaces. */
  firstRunCompleted: boolean;
};

// Backed by TenantSessionProvider (mounted once in src/app/app/layout.tsx)
// rather than fetching independently per call site -- see that file for why.
export function useTenantSession() {
  return useTenantSessionContext();
}
