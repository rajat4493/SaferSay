"use client";

import { AppShell } from "@/components/AppShell";

export default function WorkspaceSettingsPage() {
  return (
    <AppShell
      title="Settings"
      subtitle="Configure your workspace confidentiality settings."
    >
      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="font-semibold">Confidentiality Threshold</h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Reports only show when this many people have responded.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium">Minimum group size (k-value)</label>
            <input
              type="number"
              min="2"
              max="50"
              defaultValue="5"
              className="mt-2 w-32 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
