"use client";

import { AppShell } from "@/components/AppShell";

export default function WorkspaceGoLivePage() {
  return (
    <AppShell
      title="Go-live Checklist"
      subtitle="Production readiness checks before running your first survey."
    >
      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="font-semibold">Pre-production Checklist</h2>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded" />
              <span className="text-sm">Employee directory loaded (at least 5 people)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded" />
              <span className="text-sm">Confidentiality threshold reviewed and confirmed</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded" />
              <span className="text-sm">Test survey created and reviewed</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded" />
              <span className="text-sm">Team briefed on confidentiality model</span>
            </label>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
