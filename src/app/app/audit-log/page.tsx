"use client";

import { useEffect, useState } from "react";
import { AppShell, Card } from "@/components/AppShell";
import { SkeletonRow } from "@/components/Skeleton";

type AuditLogRow = {
  id: string;
  actorRole: string;
  actorId: string;
  action: string;
  targetType: string | null;
  safeCounts: Record<string, number> | null;
  details: string | null;
  createdAt: string;
};

const actionLabels: Record<string, string> = {
  survey_created: "Created a survey",
  survey_closed: "Closed a survey",
  survey_deleted: "Deleted a survey",
  invites_sent: "Sent invites",
  reminders_sent: "Sent reminders",
  employee_list_imported: "Imported employee list",
  employee_added: "Added an employee",
  employee_removed: "Removed an employee",
  report_exported: "Exported a report",
  threshold_changed: "Changed the minimum group size",
  settings_updated: "Updated workspace settings",
  team_invite_sent: "Invited a teammate",
  team_member_removed: "Removed a teammate",
};

const roleLabels: Record<string, string> = {
  customer_admin: "Workspace Owner",
  survey_creator: "Survey Admin",
  auditor: "Report Viewer",
  employee: "Employee",
};

function formatCounts(counts: Record<string, number> | null): string {
  if (!counts) return "";
  return Object.entries(counts)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
    .join(", ");
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/audit-log")
      .then((response) => response.json())
      .then((data: { ok?: boolean; logs?: AuditLogRow[]; error?: string }) => {
        if (!data.ok) {
          setError(data.error ?? "Couldn't load the audit log.");
          return;
        }
        setLogs(data.logs ?? []);
      })
      .catch(() => setError("Couldn't load the audit log."));
  }, []);

  return (
    <AppShell title="Audit log" subtitle="Operator actions only — never who responded, or what they said.">
      <Card>
        {error ? (
          <p className="secondary-text font-medium text-[var(--red)]">{error}</p>
        ) : !logs ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : logs.length === 0 ? (
          <p className="secondary-text">No actions recorded yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {logs.map((row) => (
              <div key={row.id} className="grid gap-1 py-3 text-[13px] first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--ink)]">{actionLabels[row.action] ?? row.action}</span>
                  <span className="text-xs text-[var(--ink-faint)]">{new Date(row.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[var(--ink-mid)]">
                  {row.actorId} ({roleLabels[row.actorRole] ?? row.actorRole})
                  {row.details ? ` — ${row.details}` : ""}
                  {formatCounts(row.safeCounts) ? ` — ${formatCounts(row.safeCounts)}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
