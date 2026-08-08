"use client";

import { useEffect, useState } from "react";
import { ConsoleCard, StatTile } from "@/components/console/ConsoleUI";

type Usage = {
  totalSurveysCreated: number;
  totalResponsesSubmitted: number;
  invitesSent: number;
  invitesPending: number;
  invitesFailed: number;
  databaseHealthy: boolean;
};

export function UsageHealthPanel() {
  const [usage, setUsage] = useState<Usage | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/super-admin/usage")
      .then((response) => response.json())
      .then((data) => setUsage(data.ok ? data.usage : null))
      .catch(() => setUsage(null));
  }, []);

  if (usage === undefined) return <p className="secondary-text">Loading usage...</p>;
  if (usage === null) return <p className="secondary-text">Couldn&apos;t load usage data.</p>;

  return (
    <div className="space-y-[9px]">
      <h1 className="page-title">Usage &amp; Health</h1>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Surveys created" value={usage.totalSurveysCreated} hint="Platform-wide, all time" />
        <StatTile label="Responses submitted" value={usage.totalResponsesSubmitted} hint="Aggregate count only" />
        <StatTile label="Invites sent" value={usage.invitesSent} />
        <StatTile label="Invites failed" value={usage.invitesFailed} hint={usage.invitesFailed > 0 ? "Check Support & Alerts" : "None"} />
      </div>

      <ConsoleCard>
        <h2 className="meta-label">System health</h2>
        <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--ink)]">
          <span className={`h-2 w-2 rounded-full ${usage.databaseHealthy ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />
          Database connectivity: {usage.databaseHealthy ? "Healthy" : "Unreachable"}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-[var(--ink)]">
          <span className={`h-2 w-2 rounded-full ${usage.invitesPending === 0 ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />
          Delivery queue: {usage.invitesPending} pending
        </div>
        <p className="mt-4 text-xs text-[var(--ink-faint)]">Error-rate/uptime monitoring and background job status aren&apos;t wired to an observability provider yet.</p>
      </ConsoleCard>
    </div>
  );
}
