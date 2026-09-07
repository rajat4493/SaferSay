"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { TenantSessionInfo } from "@/lib/useTenantSession";

type TenantSessionContextValue = { info: TenantSessionInfo | null; loaded: boolean };

const TenantSessionContext = createContext<TenantSessionContextValue>({ info: null, loaded: false });

/**
 * Fetches /api/tenants/current exactly once per visit to the /app section,
 * not once per page. Before this existed, every page called useTenantSession
 * independently, and since each page.tsx is its own component (not a
 * persistent layout), navigating anywhere re-mounted the hook from scratch
 * -- so AppShell's sidebar nav (which renders nothing until this resolves)
 * flashed empty on every single navigation, not just the first load.
 * Mounted once in src/app/app/layout.tsx, which -- unlike a page -- does
 * NOT remount on client-side navigation within /app/**, so this fetch (and
 * the nav items it unlocks) only ever happens once per section visit.
 */
export function TenantSessionProvider({ children }: { children: ReactNode }) {
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

  return <TenantSessionContext.Provider value={{ info, loaded }}>{children}</TenantSessionContext.Provider>;
}

export function useTenantSessionContext() {
  return useContext(TenantSessionContext);
}
