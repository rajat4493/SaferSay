"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  members: Array<{ email: string; role: string; joinedAt: string }>;
};

const roleLabels: Record<string, string> = {
  customer_admin: "HR Admin",
  survey_creator: "Survey Creator",
  auditor: "Viewer",
  employee: "Employee",
};

const planTiers: Array<{ value: "standard" | "growth" | "enterprise"; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

const featureKeys: Array<{ key: string; label: string }> = [
  { key: "customQuestions", label: "Custom question editing" },
  { key: "csvManagerHierarchy", label: "Manager hierarchy import" },
  { key: "brandStudio", label: "Custom workspace branding" },
];

export function TenantDetailPanel({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null | undefined>(undefined);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingMinGroup, setSavingMinGroup] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState("");

  async function enterWorkspace() {
    setEntering(true);
    setEnterError("");
    try {
      const response = await fetch("/api/super-admin/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setEnterError(data.error ?? "Couldn't enter that workspace.");
        setEntering(false);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setEnterError("Couldn't enter that workspace — check your connection and try again.");
      setEntering(false);
    }
  }

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
    return <p className="secondary-text">Loading tenant...</p>;
  }
  if (tenant === null) {
    return <p className="secondary-text">Tenant not found.</p>;
  }

  return (
    <div className="space-y-[9px]">
      <Link href="/console/tenants" className="inline-flex items-center gap-1.5 secondary-text font-medium hover:text-[var(--ink)]">
        <ArrowLeft size={14} strokeWidth={1.8} />
        All tenants
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{tenant.name}</h1>
          <p className="secondary-text">/{tenant.slug}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2.5">
            <PlanBadge tier={tenant.planTier} />
            <button onClick={enterWorkspace} disabled={entering} className="btn-secondary">
              {entering ? "Entering..." : "Enter workspace →"}
            </button>
          </div>
          {enterError ? <p className="text-xs font-medium text-[var(--red)]">{enterError}</p> : null}
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <ConsoleCard>
          <h2 className="meta-label">Metadata</h2>
          <dl className="mt-3 space-y-2 text-[13px]">
            <Row label="Joined" value={formatDate(tenant.createdAt)} />
            <Row label="Primary contact" value={tenant.primaryContactEmail ?? "No owner user yet"} />
            <Row label="Data residency" value={tenant.dataResidencyRegion} />
            <Row label="Employees" value={String(tenant.employeeCount)} />
          </dl>
        </ConsoleCard>

        <ConsoleCard>
          <h2 className="meta-label">Survey activity</h2>
          {tenant.latestCycle ? (
            <dl className="mt-3 space-y-2 text-[13px]">
              <Row label="Latest survey" value={tenant.latestCycle.name} />
              <Row label="Status" value={tenant.latestCycle.status} />
              <Row label="Responses" value={`${tenant.latestCycle.respondedCount} of ${tenant.latestCycle.participantCount} responded`} />
              <Row label="Completion rate" value={`${Math.round(tenant.latestCycle.completionRate * 100)}%`} />
            </dl>
          ) : (
            <p className="mt-3 secondary-text">No survey created yet.</p>
          )}
          <p className="mt-4 text-xs text-[var(--ink-faint)]">Counts and rates only. No answers or reports are visible here.</p>
        </ConsoleCard>

        <ConsoleCard>
          <h2 className="meta-label">Plan &amp; features</h2>
          <div className="mt-3 flex gap-2">
            {planTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => updatePlan(tier.value)}
                disabled={savingPlan}
                className={`flex-1 rounded-[var(--radius-input)] border px-3 py-2 text-[13px] font-medium transition ${
                  tenant.planTier === tier.value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {featureKeys.map((feature) => (
              <label key={feature.key} className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--ink)]">
                {feature.label}
                <input type="checkbox" checked={Boolean(tenant.features[feature.key])} onChange={() => toggleFeature(feature.key)} disabled={savingPlan} className="h-4 w-4" />
              </label>
            ))}
          </div>

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <label className="text-[13px] font-medium text-[var(--ink)]">Confidentiality threshold (min group size)</label>
            <div className="mt-2 flex items-center gap-3">
              <input type="range" min={3} max={10} value={tenant.minGroupSize} disabled={savingMinGroup} onChange={(event) => updateMinGroup(Number(event.target.value))} className="flex-1" />
              <span className="data-number w-8 text-[14px]">{tenant.minGroupSize}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">Floor of 3 enforced. Never disableable.</p>
          </div>
        </ConsoleCard>

        <ConsoleCard>
          <h2 className="meta-label">Billing</h2>
          <p className="mt-3 secondary-text">Stripe isn&apos;t connected yet — subscription status will appear here once billing is live.</p>
        </ConsoleCard>
      </div>

      <ConsoleCard>
        <h2 className="meta-label">Members</h2>
        <p className="mt-1 text-xs text-[var(--ink-faint)]">Who has access, read-only — team management happens inside the tenant&apos;s own workspace, not here.</p>
        <div className="mt-3 space-y-2">
          {tenant.members.length === 0 ? (
            <p className="secondary-text">No members yet.</p>
          ) : (
            tenant.members.map((member) => (
              <div key={member.email} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border)] p-3 text-[13px]">
                <div>
                  <p className="font-medium text-[var(--ink)]">{member.email}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-faint)]">Joined {formatDate(member.joinedAt)}</p>
                </div>
                <span className="secondary-text">{roleLabels[member.role] ?? member.role}</span>
              </div>
            ))
          )}
        </div>
      </ConsoleCard>

      <ConsoleCard>
        <h2 className="meta-label">Support notes</h2>
        <p className="mt-1 text-xs text-[var(--ink-faint)]">Operational notes only — never a path to this tenant&apos;s data.</p>
        <div className="mt-3 flex gap-2">
          <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add a note for this tenant..." className="admin-input h-9 flex-1" />
          <button onClick={submitNote} disabled={addingNote || !noteDraft.trim()} className="btn-primary shrink-0">
            Add
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {tenant.supportNotes.length === 0 ? (
            <p className="secondary-text">No notes yet.</p>
          ) : (
            tenant.supportNotes.map((note) => (
              <div key={note.id} className="rounded-[var(--radius-input)] border border-[var(--border)] p-3 text-[13px]">
                <p className="text-[var(--ink)]">{note.note}</p>
                <p className="mt-1 text-xs text-[var(--ink-faint)]">
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
      <dt className="text-[var(--ink-mid)]">{label}</dt>
      <dd className="font-medium text-[var(--ink)]">{value}</dd>
    </div>
  );
}
