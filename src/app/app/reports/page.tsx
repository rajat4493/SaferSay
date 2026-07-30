"use client";

import { EyeOff } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { useSurveyData } from "@/components/DataProvider";
import { buildReport } from "@/lib/localData";

export default function ReportsPage() {
  const { data } = useSurveyData();
  const cycle = data.responses.cycles[0];
  const report = buildReport(data, cycle.id);

  return (
    <AppShell title="Reports" subtitle="Board-ready outputs that never render protected small groups.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><h2 className="text-3xl font-semibold">{report.n}</h2><p className="text-sm text-[var(--brand-muted)]">Responses</p></Card>
        <Card><h2 className="text-3xl font-semibold">5</h2><p className="text-sm text-[var(--brand-muted)]">Minimum group size</p></Card>
        <Card><h2 className="text-3xl font-semibold">{report.protected ? "Protected" : "Open"}</h2><p className="text-sm text-[var(--brand-muted)]">Report state</p></Card>
      </div>
      <Card className="mt-4">
        {report.protected ? (
          <div>
            <div className="flex items-center gap-2 font-semibold text-[var(--brand-accent)]"><EyeOff size={18} /> Results hidden</div>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">The response store has data, but the reporting layer refuses to render it until 5 submissions exist.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {report.rows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex justify-between text-sm"><span>{row.label}</span><span>{row.value}</span></div>
                <div className="h-2 rounded-full bg-[var(--brand-border)]"><div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: row.width }} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
