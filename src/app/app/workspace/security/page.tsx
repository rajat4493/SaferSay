"use client";

import { AppShell } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";

export default function WorkspaceSecurityPage() {
  return (
    <AppShell
      title="Security & Confidentiality"
      subtitle="Understand how SaferSay keeps responses completely confidential."
    >
      <div className="space-y-6">
        <ConfidentialitySeal />
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="font-semibold">Confidentiality Architecture</h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Severed stores, row-level security, k-anonymity threshold, and automatic roll-up rules ensure no individual response is ever visible.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
