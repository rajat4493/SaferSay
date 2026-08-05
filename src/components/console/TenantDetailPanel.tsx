"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConsoleCard, PlanBadge, formatDate, formatRelative } from "@/components/console/ConsoleUI";

type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  primaryContactEmail: string | null;
  dataResidencyRegion: string;
  planTier: "standard" | "growth" | "enterprise";
  features: Record<string, boolean>;
  minGroupSize: number;
  employeeCount: number;
  latestCycle: {
    id: string;
    name: string;
    status: string;
    participantCount: number;
    respondedCount: number;
    completionRate: number;
  } | null;
  supportNotes: Array<{ id: string; authorEmail: string; note: string; createdAt: string }>;
};

const planTiers: Array<{ value: "standard" | "growth" | "enterprise"; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

const featureKeys: Array<{ key: string; label: string }> = [
  { key: "customQuestions", label: "Custom question editing" },
  { key: "csvManagerHierarchy", label: "Manager hierarchy import" },
  { key: "brandStudio", label: "Brand Studio white-labeling" },
];

export function TenantDetailPanel({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<TenantDetail | null | undefined>(undefined);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingMinGroup, setSavingMinGroup] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  function load() {
    fetch(`/api/super-admin/tenants/${tenantId}`)
      .then((response) => response.json())
      .then((data) => setTenant(data.ok ? data.tenant : null))
      .catch(() => setTenant(null));
  }

  useEffect(load, [tenantId]);

  async function patch(body: Record<string, unknown>) {
    const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.ok) setTenant(data.tenant);
  }

  async function updatePlan(planTier: "standard" | "growth" | "enterprise") {
    setSavingPlan(true);
    await patch({ planTier });
    setSavingPlan(false);
  }

  async function toggleFeature(key: string) {
    if (!tenant) return;
    setSavingPlan(true);
    await patch({ features: { ...tenant.features, [key]: !tenant.features[key] } });
    setSavingPlan(false);
  }

  async function updateMinGroup(value: number) {
    setSavingMinGroup(true);
    await patch({ minGroupSize: value });
    setSavingMinGroup(false);
  }

  async function submitNote() {
    if (!noteDraft.trim()) return;
    setAddingNote(true);
    await patch({ note: noteDraft.trim() });
    setNoteDraft("");
    setAddingNote(false);
  }

  if (tenant === undefined) {
    return <p className="text-sm text-[var(--brand-muted)]">Loading tenant...</p>;
  }
  if (tenant === null) {
    return <p className="text-sm text-[var(--brand-muted)]">Tenant not found.</p>;
  }

  return (
    <div className="space-y-4">
      <Link href="/console/tenants" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-muted)] hover:text-[var(--brand-ink)]">
        <ArrowLeft size={15} />
        All tenants
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
          <p className="text-sm text-[var(--brand-muted)]">/{tenant.slug}</p>
        </div>
        <PlanBadge tier={tenant.planTier} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConsoleCard>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Metadata</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Joined" value={formatDate(tenant.createdAt)} />
            <Row label="Primary contact" value={tenant.primaryContactEmail ?? "No owner user yet"} />
            <Row label="Data residency" value={tenant.dataResidencyRegion} />
            <Row label="Employees" value={String(tenant.employeeCount)} />
          </dl>
        </ConsoleCard>

        <ConsoleCard>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Survey activity</h2>
          {tenant.latestCycle ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Latest survey" value={tenant.latestCycle.name} />
              <Row label="Status" value={tenant.latestCycle.status} />
              <Row
                label="Responses"
                value={`${tenant.latestCycle.respondedCount} of ${tenant.latestCycle.participantCount} responded`}
              />
              <Row label="Completion rate" value={`${Math.round(tenant.latestCycle.completionRate * 100)}%`} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-[var(--brand-muted)]">No survey created yet.</p>
          )}
          <p className="mt-4 text-xs text-[var(--brand-muted)]">Counts and rates only. No answers or reports are visible here.</p>
        </ConsoleCard>

        <ConsoleCard>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Plan & features</h2>
          <div className="mt-3 flex gap-2">
            {planTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => updatePlan(tier.value)}
                disabled={savingPlan}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  tenant.planTier === tier.value
                    ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                    : "border-[var(--brand-border)] bg-white text-[var(--brand-ink)]"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {featureKeys.map((feature) => (
              <label key={feature.key} className="flex items-center justify-between rounded-xl border border-[var(--brand-border)] px-3 py-2 text-sm">
                {feature.label}
                <input
                  type="checkbox"
                  checked={Boolean(tenant.features[feature.key])}
                  onChange={() => toggleFeature(feature.key)}
                  disabled={savingPlan}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 border-t border-[var(--brand-border)] pt-4">
            <label className="text-sm font-semibold">Confidentiality threshold (min group size)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={10}
                value={tenant.minGroupSize}
                disabled={savingMinGroup}
                onChange={(event) => updateMinGroup(Number(event.target.value))}
                className="flex-1"
              />
              <span className="w-8 text-sm font-semibold">{tenant.minGroupSize}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">Floor of 3 enforced. Never disableable.</p>
          </div>
        </ConsoleCard>

        <ConsoleCard>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Billing</h2>
          <p className="mt-3 text-sm text-[var(--brand-muted)]">Stripe isn&apos;t connected yet — subscription status will appear here once billing is live.</p>
        </ConsoleCard>
      </div>

      <ConsoleCard>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Support notes</h2>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">Operational notes only — never a path to this tenant&apos;s data.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add a note for this tenant..."
            className="h-10 flex-1 rounded-xl border border-[var(--brand-border)] px-3 text-sm outline-none focus:border-[var(--brand-accent)]"
          />
          <button
            onClick={submitNote}
            disabled={addingNote || !noteDraft.trim()}
            className="h-10 shrink-0 rounded-xl bg-[var(--brand-ink)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {tenant.supportNotes.length === 0 ? (
            <p className="text-sm text-[var(--brand-muted)]">No notes yet.</p>
          ) : (
            tenant.supportNotes.map((note) => (
              <div key={note.id} className="rounded-xl border border-[var(--brand-border)] p-3 text-sm">
                <p>{note.note}</p>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">
                  {note.authorEmail} · {formatRelative(note.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </ConsoleCard>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--brand-muted)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
