"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ConsoleCard, EmptyState, StatTile, formatRelative } from "@/components/console/ConsoleUI";
import { SkeletonCard } from "@/components/Skeleton";

type Overview = {
  activeTenantCount: number;
  liveSurveyCount: number;
  totalEmployeeCount: number;
  inactiveTenantCount: number;
  tenantGrowth: Array<{ weekStart: string; cumulativeTenants: number }>;
  attention: Array<{ tenantId: string; tenantName: string; kind: string; detail: string }>;
  recentActivity: Array<{ tenantId: string; tenantName: string; eventKey: string; occurredAt: string }>;
};

const eventLabels: Record<string, string> = {
  signup: "signed up",
  employees: "uploaded employees",
  cycle: "created a survey",
  tokens: "issued invite tokens",
  outbox: "prepared invites",
  queue: "queued deliveries",
  responses: "received responses",
  report: "unlocked a report",
};

function TrendSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const width = 280;
  const height = 60;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-16 w-full">
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OverviewDashboard() {
  const [overview, setOverview] = useState<Overview | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/super-admin/overview")
      .then((response) => response.json())
      .then((data) => setOverview(data.ok ? data.overview : null))
      .catch(() => setOverview(null));
  }, []);

  if (overview === undefined) {
    return (
      <div className="space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }
  if (overview === null) {
    return <p className="secondary-text">Couldn&apos;t load platform overview.</p>;
  }

  return (
    <div className="space-y-[9px]">
      <h1 className="page-title">Overview</h1>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active tenants" value={overview.activeTenantCount} />
        <StatTile label="Live surveys" value={overview.liveSurveyCount} />
        <StatTile label="Employees under management" value={overview.totalEmployeeCount} />
        <StatTile label="Inactive 30+ days" value={overview.inactiveTenantCount} hint="No billing yet — MRR/trials appear once Stripe lands." />
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <ConsoleCard>
          <h2 className="meta-label flex items-center gap-2">
            <AlertTriangle size={13} strokeWidth={1.8} />
            Needs attention
          </h2>
          <div className="mt-3 space-y-2">
            {overview.attention.length === 0 ? (
              <p className="secondary-text">Nothing needs attention right now.</p>
            ) : (
              overview.attention.slice(0, 8).map((item, index) => (
                <Link key={`${item.tenantId}-${item.kind}-${index}`} href={`/console/tenants/${item.tenantId}`} className="card card-interactive block text-[13px]">
                  <span className="font-medium text-[var(--ink)]">{item.tenantName}</span> <span className="text-[var(--ink-mid)]">— {item.detail}</span>
                </Link>
              ))
            )}
          </div>
        </ConsoleCard>

        <ConsoleCard>
          <h2 className="meta-label">Recent activity</h2>
          <div className="mt-3 space-y-2">
            {overview.recentActivity.length === 0 ? (
              <p className="secondary-text">No activity yet.</p>
            ) : (
              overview.recentActivity.slice(0, 10).map((item, index) => (
                <div key={`${item.tenantId}-${item.eventKey}-${index}`} className="flex items-center justify-between text-[13px]">
                  <span className="text-[var(--ink-mid)]">
                    <span className="font-medium text-[var(--ink)]">{item.tenantName}</span> {eventLabels[item.eventKey] ?? item.eventKey}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--ink-faint)]">{formatRelative(item.occurredAt)}</span>
                </div>
              ))
            )}
          </div>
        </ConsoleCard>
      </div>

      <ConsoleCard>
        <h2 className="meta-label">Tenant growth (8 weeks)</h2>
        {overview.tenantGrowth.length > 1 ? (
          <TrendSparkline points={overview.tenantGrowth.map((point) => point.cumulativeTenants)} />
        ) : (
          <EmptyState title="Not enough history yet" description="Growth trend will populate as more tenants sign up." />
        )}
      </ConsoleCard>
    </div>
  );
}
