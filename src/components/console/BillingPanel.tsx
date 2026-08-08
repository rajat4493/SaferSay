"use client";

import { useEffect, useState } from "react";
import { EmptyState, StatTile } from "@/components/console/ConsoleUI";

export function BillingPanel() {
  const [tenantCount, setTenantCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/tenants")
      .then((response) => response.json())
      .then((data) => setTenantCount(data.ok ? (data.tenants ?? []).length : null))
      .catch(() => setTenantCount(null));
  }, []);

  return (
    <div className="space-y-[9px]">
      <h1 className="page-title">Billing</h1>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatTile label="MRR" value="—" hint="Connect Stripe to see revenue" />
        <StatTile label="Churn rate" value="—" hint="Connect Stripe to see churn" />
        <StatTile label="Billable tenants" value={tenantCount ?? "…"} hint="All tenants, plan-tier only for now" />
      </div>

      <div>
        <h2 className="meta-label mb-2">Subscriptions</h2>
        <EmptyState
          title="Stripe isn't connected yet"
          description="Per-tenant subscription status, invoices, and failed payments will appear here once the Stripe integration lands. Plan tiers can already be assigned per tenant from the Tenants page."
        />
      </div>
    </div>
  );
}
