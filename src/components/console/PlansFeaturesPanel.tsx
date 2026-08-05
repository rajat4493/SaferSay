"use client";

import { useEffect, useState } from "react";
import { ConsoleCard, PlanBadge } from "@/components/console/ConsoleUI";

const tiers = [
  {
    value: "standard",
    label: "Standard",
    description: "Default tier for every new tenant.",
    includes: ["Fixed template library", "k>=5 default confidentiality threshold", "CSV employee import"],
  },
  {
    value: "growth",
    label: "Growth",
    description: "For teams customizing their survey program.",
    includes: ["Custom question editing", "Manager hierarchy import", "Configurable confidentiality threshold (3-10)"],
  },
  {
    value: "enterprise",
    label: "Enterprise",
    description: "For larger, white-labeled deployments.",
    includes: ["Everything in Growth", "Brand Studio white-labeling", "Priority support"],
  },
] as const;

export function PlansFeaturesPanel() {
  const [distribution, setDistribution] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/tenants")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        const counts: Record<string, number> = { standard: 0, growth: 0, enterprise: 0 };
        for (const tenant of data.tenants ?? []) {
          counts[tenant.planTier] = (counts[tenant.planTier] ?? 0) + 1;
        }
        setDistribution(counts);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Plans & Features</h1>
      <p className="text-sm text-[var(--brand-muted)]">
        What each tier includes. Assign a tenant&apos;s plan and toggle individual features from that tenant&apos;s detail page.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <ConsoleCard key={tier.value}>
            <div className="flex items-center justify-between">
              <PlanBadge tier={tier.value} />
              <span className="text-sm font-semibold text-[var(--brand-muted)]">
                {distribution ? `${distribution[tier.value] ?? 0} tenants` : "…"}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{tier.label}</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">{tier.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {tier.includes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--brand-ink)]" />
                  {item}
                </li>
              ))}
            </ul>
          </ConsoleCard>
        ))}
      </div>
    </div>
  );
}
