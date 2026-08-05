"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/AppShell";

type Settings = {
  minGroupSize: number;
  dataResidencyRegion: string;
  planTier: string;
  features: Record<string, boolean>;
};

const featureLabels: Record<string, string> = {
  customQuestions: "Custom question editing",
  csvManagerHierarchy: "Manager hierarchy import",
  brandStudio: "Brand Studio white-labeling",
};

export function TenantSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/tenants/settings")
      .then((response) => response.json())
      .then((data) => setSettings(data.ok ? data.settings : null))
      .catch(() => setSettings(null));
  }

  useEffect(load, []);

  async function updateMinGroupSize(value: number) {
    setSaving(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minGroupSize: value }),
    });
    const data = await response.json();
    if (data.ok) setSettings(data.settings);
    setSaving(false);
  }

  function exportEmployeesCsv() {
    fetch("/api/employees?limit=10000")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        const rows = [
          ["Email", "Name", "Team", "Location", "Status"],
          ...data.employees.map((e: { email: string; name: string | null; team: string | null; location: string | null; employmentStatus: string }) => [
            e.email,
            e.name ?? "",
            e.team ?? "",
            e.location ?? "",
            e.employmentStatus,
          ]),
        ];
        const csv = rows.map((row) => row.map((cell: string) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "safersay-employees.csv";
        link.click();
        URL.revokeObjectURL(url);
      });
  }

  if (settings === undefined) return <p className="text-sm text-[var(--brand-muted)]">Loading settings...</p>;
  if (settings === null) return <p className="text-sm text-[var(--brand-muted)]">Couldn&apos;t load settings.</p>;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-semibold">Confidentiality threshold</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--brand-muted)]">
          The minimum number of responses required before any group&apos;s results unlock. You can tune this within a safe range, but it can never go below 3 — that&apos;s the point at which &quot;confidential&quot; stops meaning anything.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={3}
            max={10}
            value={settings.minGroupSize}
            disabled={saving}
            onChange={(event) => updateMinGroupSize(Number(event.target.value))}
            className="flex-1"
          />
          <span className="w-10 text-lg font-semibold">{settings.minGroupSize}</span>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Plan & features</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)] capitalize">Current plan: <span className="font-semibold">{settings.planTier}</span></p>
        <div className="mt-3 space-y-1.5 text-sm">
          {Object.entries(featureLabels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-[var(--brand-border)] px-3 py-2">
              {label}
              <span className={`text-xs font-semibold ${settings.features[key] ? "text-[var(--brand-accent)]" : "text-[var(--brand-muted)]"}`}>
                {settings.features[key] ? "Included" : "Not included"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--brand-muted)]">
          To change your plan or feature set, contact SaferSay — this is set by your account, not editable here.
        </p>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Branding</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">Logo, name, and theme live in Brand Studio.</p>
        <Link href="/app/brand" className="mt-3 inline-flex h-10 items-center rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-4 text-sm font-semibold">
          Open Brand Studio
        </Link>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Data export & deletion</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--brand-muted)]">
          Your data is always exportable, never held hostage. Report exports are available from the Reports page once unlocked.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={exportEmployeesCsv} className="h-10 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-4 text-sm font-semibold">
            Export employee list (CSV)
          </button>
          <a
            href="mailto:privacy@safersay.com?subject=Account%20deletion%20request"
            className="h-10 inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-4 text-sm font-semibold"
          >
            Request account deletion
          </a>
        </div>
      </Card>
    </div>
  );
}
