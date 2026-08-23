"use client";

import { useEffect, useState } from "react";
import { AppShell, Card } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";
import { retentionPlans, surveyCreditPacks, type BillingTerms, type RetentionPlan } from "@/lib/billingCatalog";

type Settings = {
  planTier: string;
  features: Record<string, boolean>;
  billingTerms: BillingTerms;
};

export default function WorkspaceBillingPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tenants/settings")
      .then((response) => response.json())
      .then((data) => setSettings(data.ok ? data.settings : null))
      .catch(() => setSettings(null));
  }, []);

  async function startCheckout(body: { purchaseType: "survey_credits"; creditPackId: string } | { purchaseType: "report_retention"; retentionPlanId: RetentionPlan }) {
    const requestKey = "creditPackId" in body ? body.creditPackId : body.retentionPlanId;
    setRequesting(requestKey);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Checkout could not be created." }));
    setRequesting(null);
    if (data.ok && data.checkoutUrl) {
      window.location.assign(data.checkoutUrl);
      return;
    }
    toast.show({ variant: "error", message: data.error ?? "Checkout could not be created." });
  }

  async function requestChange(body: { retentionPlanId: RetentionPlan }) {
    const requestKey = body.retentionPlanId;
    setRequesting(requestKey);
    const response = await fetch("/api/tenants/billing/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Request could not be sent." }));
    setRequesting(null);
    toast.show({
      variant: data.ok ? "success" : "error",
      message: data.ok ? "Request sent. SaferSay will confirm the contract change." : data.error ?? "Request could not be sent.",
    });
  }

  return (
    <AppShell title="Billing" subtitle="Buy survey credits, keep reports only if useful, release without traps.">
      <div className="grid gap-2.5 md:grid-cols-3">
        <Card>
          <p className="meta-label">Available credits</p>
          <p className="data-number mt-2">{settings?.billingTerms.surveyCredits ?? "…"}</p>
          <p className="mt-1 secondary-text">Credits are spent when you launch a survey, not while drafting.</p>
        </Card>
        <Card>
          <p className="meta-label">Retention</p>
          <p className="data-number mt-2 capitalize">{settings?.billingTerms.retentionPlan ?? "…"}</p>
          <p className="mt-1 secondary-text">Release after export, or keep reports online month to month.</p>
        </Card>
        <Card>
          <p className="meta-label">Credit window</p>
          <p className="data-number mt-2">{settings ? `${settings.billingTerms.creditExpiryMonths}mo` : "…"}</p>
          <p className="mt-1 secondary-text">Unused credits carry forward inside this window.</p>
        </Card>
      </div>

      <Card className="mt-[9px]">
        <h2 className="section-title">Survey credits</h2>
        <p className="mt-1 secondary-text">No annual contract and no per-user pricing. Buy only the confidential survey cycles you need. AI interpretation is included with paid credits.</p>
        <div className="mt-4 grid gap-2.5 md:grid-cols-3">
          {surveyCreditPacks.map((pack) => (
            <div key={pack.id} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-4">
              <h3 className="font-semibold text-[var(--ink)]">{pack.name}</h3>
              <p className="data-number mt-2 text-[22px]">{pack.price}</p>
              <p className="mt-2 secondary-text">{pack.description}</p>
              <button onClick={() => startCheckout({ purchaseType: "survey_credits", creditPackId: pack.id })} disabled={requesting === pack.id} className="btn-primary mt-4 w-full">
                {requesting === pack.id ? "Opening..." : "Buy credits"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-[9px]">
        <h2 className="section-title">Included with paid credits</h2>
        <p className="mt-1 secondary-text">These capabilities unlock when survey credits are purchased, or when SaferSay enables them for a pilot.</p>
        <div className="mt-4 grid gap-2.5 md:grid-cols-4">
          {[
            ["AI summary", "Plain-English interpretation based only on group scores."],
            ["Quick wins", "Separates fixes for this week from deeper work."],
            ["Next action", "One recommended step based on the lowest group score."],
            ["Provider managed", "SaferSay runs the AI provider; customers do not need their own key."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-4">
              <h3 className="font-semibold text-[var(--ink)]">{title}</h3>
              <p className="mt-2 secondary-text">{description}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--ink-faint)]">Enterprise contracts can use a customer-owned AI provider if required, but the default paid-credit plan includes SaferSay-managed AI.</p>
      </Card>

      <Card className="mt-[9px]">
        <h2 className="section-title">Report retention</h2>
        <p className="mt-1 secondary-text">After a survey, export and release for free, or keep reports available for trend lines and audit history.</p>
        <div className="mt-4 grid gap-2.5 md:grid-cols-3">
          {retentionPlans.map((plan) => (
            <div key={plan.id} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-4">
              <h3 className="font-semibold text-[var(--ink)]">{plan.name}</h3>
              <p className="data-number mt-2 text-[22px]">{plan.price}</p>
              <p className="mt-2 secondary-text">{plan.description}</p>
              <button
                onClick={() => plan.id === "none" ? requestChange({ retentionPlanId: plan.id }) : startCheckout({ purchaseType: "report_retention", retentionPlanId: plan.id })}
                disabled={requesting === plan.id}
                className="btn-secondary mt-4 w-full"
              >
                {requesting === plan.id ? "Opening..." : plan.id === "none" ? "Request release" : "Start retention"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {settings ? (
        <Card className="mt-[9px]">
          <h2 className="section-title">Current contract note</h2>
          <p className="mt-1 secondary-text">{settings.billingTerms.contractNote}</p>
        </Card>
      ) : null}
    </AppShell>
  );
}
