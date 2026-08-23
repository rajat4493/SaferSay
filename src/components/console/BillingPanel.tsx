"use client";

import { useEffect, useState } from "react";
import { hasAIInsightsEntitlement, retentionPlans, surveyCreditPacks, type BillingTerms } from "@/lib/billingCatalog";
import { ConsoleCard, EmptyState, StatTile } from "@/components/console/ConsoleUI";

type TenantBillingRow = {
  billingTerms: BillingTerms;
  features: Record<string, boolean>;
};

function moneyToNumber(value: string) {
  return Number(value.replace(/[^0-9.]/g, ""));
}

function retentionMonthlyValue(planId: BillingTerms["retentionPlan"]) {
  const plan = retentionPlans.find((item) => item.id === planId);
  return plan ? moneyToNumber(plan.price) : 0;
}

export function BillingPanel() {
  const [tenants, setTenants] = useState<TenantBillingRow[] | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/tenants")
      .then((response) => response.json())
      .then((data) => setTenants(data.ok ? (data.tenants ?? []) : []))
      .catch(() => setTenants([]));
  }, []);

  const tenantCount = tenants?.length ?? null;
  const totalCredits = tenants?.reduce((sum, tenant) => sum + tenant.billingTerms.surveyCredits, 0) ?? null;
  const aiEnabled = tenants?.filter((tenant) => hasAIInsightsEntitlement(tenant.features, tenant.billingTerms)).length ?? null;
  const retentionMrr = tenants?.reduce((sum, tenant) => sum + retentionMonthlyValue(tenant.billingTerms.retentionPlan), 0) ?? null;
  const retainedTenants = tenants?.filter((tenant) => tenant.billingTerms.retentionPlan !== "none").length ?? null;

  return (
    <div className="space-y-[9px]">
      <h1 className="page-title">Billing</h1>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatTile label="Estimated retention MRR" value={retentionMrr === null ? "…" : `$${retentionMrr}`} hint={`${retainedTenants ?? "…"} tenant${retainedTenants === 1 ? "" : "s"} retaining reports`} />
        <StatTile label="Unused credits held" value={totalCredits ?? "…"} hint="Credits already assigned to tenants" />
        <StatTile label="AI-enabled tenants" value={aiEnabled ?? "…"} hint="Paid-credit entitlement or manual override" />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatTile label="Checkout" value="Ready" hint="Credit and retention checkout routes are wired" />
        <StatTile label="Stripe revenue feed" value="Pending" hint="Invoices, refunds, failed payments, and actual collected revenue still need Stripe event reporting" />
        <StatTile label="Billable tenants" value={tenantCount ?? "…"} hint="Credits and retention are tenant-level" />
      </div>

      <div>
        <h2 className="meta-label mb-2">Operational billing model</h2>
        <EmptyState
          title="Credits first, retention optional"
          description="This page shows app-side commercial entitlements. Actual collected revenue, failed payments, refunds, and invoice status require Stripe event reporting after staging is verified."
        />
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <ConsoleCard>
          <h2 className="section-title">Survey credit catalog</h2>
          <div className="mt-3 space-y-2">
            {surveyCreditPacks.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border)] p-3 text-[13px]">
                <div>
                  <p className="font-medium text-[var(--ink)]">{pack.name}</p>
                  <p className="text-xs text-[var(--ink-faint)]">{pack.description}</p>
                </div>
                <span className="font-semibold text-[var(--ink)]">{pack.price}</span>
              </div>
            ))}
          </div>
        </ConsoleCard>
        <ConsoleCard>
          <h2 className="section-title">Retention catalog</h2>
          <div className="mt-3 space-y-2">
            {retentionPlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border)] p-3 text-[13px]">
                <div>
                  <p className="font-medium text-[var(--ink)]">{plan.name}</p>
                  <p className="text-xs text-[var(--ink-faint)]">{plan.description}</p>
                </div>
                <span className="font-semibold text-[var(--ink)]">{plan.price}</span>
              </div>
            ))}
          </div>
        </ConsoleCard>
      </div>
    </div>
  );
}
