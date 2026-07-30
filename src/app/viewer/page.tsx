"use client";

import { EyeOff } from "lucide-react";
import { ViewerCard, ViewerShell } from "@/components/ViewerShell";
import { useSurveyData } from "@/components/DataProvider";
import { buildReport } from "@/lib/localData";

export default function ViewerOverview() {
  const { data } = useSurveyData();
  const report = buildReport(data, data.responses.cycles[0].id);

  return (
    <ViewerShell title="Leadership Overview" subtitle="Executive and HRBP view: aggregate results only, no identity or participation table.">
      <div className="grid gap-4 lg:grid-cols-3">
        <ViewerCard><h2 className="text-3xl font-semibold">{report.n}</h2><p className="text-sm text-[var(--brand-muted)]">Responses</p></ViewerCard>
        <ViewerCard><h2 className="text-3xl font-semibold">5</h2><p className="text-sm text-[var(--brand-muted)]">Minimum group size</p></ViewerCard>
        <ViewerCard><h2 className="text-3xl font-semibold">{report.protected ? "Protected" : "Visible"}</h2><p className="text-sm text-[var(--brand-muted)]">Dashboard state</p></ViewerCard>
      </div>
      <ViewerCard>
        {report.protected ? (
          <div className="mt-4 flex items-center gap-2 font-semibold text-[var(--brand-accent)]"><EyeOff size={18} /> Not enough responses to show results yet.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {report.rows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex justify-between text-sm"><span>{row.label}</span><span>{row.value}</span></div>
                <div className="h-2 rounded-full bg-[var(--brand-border)]"><div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: row.width }} /></div>
              </div>
            ))}
          </div>
        )}
      </ViewerCard>
    </ViewerShell>
  );
}
