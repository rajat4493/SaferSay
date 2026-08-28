"use client";

import { useEffect, useState } from "react";

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

export function useTenantSession() {
  const [info, setInfo] = useState<TenantSessionInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        setInfo({
          role: data.role,
          isSuperAdmin: data.isSuperAdmin,
          isImpersonating: data.isImpersonating,
          tenantName: data.tenant?.name ?? "",
          userEmail: data.userEmail ?? "",
          userName: data.userName ?? null,
          firstRunCompleted: Boolean(data.firstRunCompleted),
        });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  return { info, loaded };
}
