"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tenant = { id: string; name: string; slug: string };

export function SuperAdminTenantSwitcher() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [homeTenantId, setHomeTenantId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/super-admin/tenants")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok || !data.isSuperAdmin) return;
        setTenants(data.tenants ?? []);
        setCurrentTenantId(data.currentTenant?.id ?? null);
        setHomeTenantId(data.homeTenantId ?? null);
        setVisible(true);
      })
      .catch(() => undefined);
  }, []);

  if (!visible) return null;

  async function switchTo(tenantId: string) {
    await fetch("/api/super-admin/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    router.refresh();
  }

  const isImpersonating = currentTenantId !== homeTenantId;

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-3 py-2 text-xs font-semibold">
      <span className={isImpersonating ? "text-[#9a392d]" : "text-[var(--brand-muted)]"}>
        {isImpersonating ? "Viewing as" : "Super admin"}
      </span>
      <select
        value={currentTenantId ?? ""}
        onChange={(event) => switchTo(event.target.value)}
        className="rounded-full border border-[var(--brand-border)] bg-white px-2 py-1 text-xs font-semibold"
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
            {tenant.id === homeTenantId ? " (yours)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
