"use client";

import { AppShell } from "@/components/AppShell";

export default function WorkspaceBillingPage() {
  return (
    <AppShell
      title="Billing"
      subtitle="Manage your plan and payment settings."
    >
      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="font-semibold">Plan & Payment</h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Your current plan information and billing settings.
          </p>
          {/* Billing implementation placeholder */}
        </div>
      </div>
    </AppShell>
  );
}
