"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/AppShell";
import { SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";

type Settings = {
  minGroupSize: number;
  dataResidencyRegion: string;
  planTier: string;
  features: Record<string, boolean>;
  safetyContactEmail: string | null;
};

const featureLabels: Record<string, string> = {
  customQuestions: "Custom question editing",
  csvManagerHierarchy: "Manager hierarchy import",
  brandStudio: "Custom workspace branding",
};

export function TenantSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  // Tracks the slider's own visual position while dragging, separate from
  // the last-saved `settings.minGroupSize` -- React binds a range input's
  // onChange to the native `input` event, which fires on every step of a
  // drag, not just on release. Committing the PATCH (and its audit-log
  // write) on every one of those would spam the server; this only sends
  // the request once, when the drag/keypress actually ends.
  const [sliderValue, setSliderValue] = useState<number | null>(null);
  // Same "draft until saved, then fall back to fresh settings" pattern as
  // sliderValue -- this is a plain text field though, so it commits on an
  // explicit Save click, not a drag-release.
  const [safetyContactDraft, setSafetyContactDraft] = useState<string | null>(null);
  const [savingSafetyContact, setSavingSafetyContact] = useState(false);
  const toast = useToast();

  function load() {
    fetch("/api/tenants/settings")
      .then((response) => response.json())
      .then((data) => setSettings(data.ok ? data.settings : null))
      .catch(() => setSettings(null));
  }

  useEffect(load, []);

  async function commitMinGroupSize() {
    if (sliderValue === null || !settings || sliderValue === settings.minGroupSize) return;
    const value = sliderValue;
    setSaving(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minGroupSize: value }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSaving(false);
    setSliderValue(null);
    if (data.ok) {
      setSettings(data.settings);
      toast.show({ variant: "success", message: `Minimum group size set to ${data.settings.minGroupSize}.` });
    } else {
      toast.show({ variant: "error", message: "Couldn't save that setting. Try again." });
    }
  }

  async function saveSafetyContact() {
    if (safetyContactDraft === null) return;
    setSavingSafetyContact(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ safetyContactEmail: safetyContactDraft }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSavingSafetyContact(false);
    if (data.ok) {
      setSettings(data.settings);
      setSafetyContactDraft(null);
      toast.show({
        variant: "success",
        message: data.settings.safetyContactEmail ? "Safety contact saved." : "Safety contact removed -- the SOS button is now hidden for respondents.",
      });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't save that setting. Try again." });
    }
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

  if (settings === undefined) {
    return (
      <div className="space-y-[9px]">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (settings === null) return <p className="secondary-text">Couldn&apos;t load settings.</p>;

  return (
    <div className="space-y-[9px]">
      <Card>
        <h2 className="section-title">Confidentiality threshold</h2>
        <p className="mt-1.5 secondary-text">
          The minimum number of responses required before any group&apos;s results unlock. You can tune this within a safe range, but it
          can never go below 3 — that&apos;s the point at which &quot;confidential&quot; stops meaning anything.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={3}
            max={10}
            value={sliderValue ?? settings.minGroupSize}
            disabled={saving}
            onChange={(event) => setSliderValue(Number(event.target.value))}
            onMouseUp={commitMinGroupSize}
            onTouchEnd={commitMinGroupSize}
            onKeyUp={commitMinGroupSize}
            className="flex-1"
          />
          <span className="data-number w-10 text-[16px]">{sliderValue ?? settings.minGroupSize}</span>
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Safety contact</h2>
        <p className="mt-1.5 secondary-text">
          Where a survey-taker&apos;s &quot;I need help&quot; message goes if they choose to identify themselves for a safety concern
          (e.g. harassment) -- separate from the anonymous survey, never included in aggregate reports.{" "}
          <strong className="text-[var(--ink)]">
            Don&apos;t use your own address, or anyone who might be the subject of a report -- pick someone a survey-taker could
            safely report about anyone else to.
          </strong>{" "}
          The &quot;I need help&quot; button won&apos;t appear for respondents until this is set.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={safetyContactDraft ?? settings.safetyContactEmail ?? ""}
            onChange={(event) => setSafetyContactDraft(event.target.value)}
            placeholder="hr@yourcompany.com"
            aria-label="Safety contact email"
            disabled={savingSafetyContact}
            className="admin-input flex-1"
          />
          <button onClick={saveSafetyContact} disabled={savingSafetyContact || safetyContactDraft === null} className="btn-primary shrink-0">
            {savingSafetyContact ? "Saving..." : "Save"}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Plan &amp; features</h2>
        <p className="mt-1.5 secondary-text capitalize">
          Current plan: <span className="font-semibold text-[var(--ink)]">{settings.planTier}</span>
        </p>
        <div className="mt-3 space-y-1.5 text-[13px]">
          {Object.entries(featureLabels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-[var(--ink)]">
              {label}
              <span className={`text-xs font-semibold ${settings.features[key] ? "text-[var(--green)]" : "text-[var(--ink-faint)]"}`}>
                {settings.features[key] ? "Included" : "Not included"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--ink-faint)]">To change your plan or feature set, contact SaferSay — this is set by your account, not editable here.</p>
      </Card>

      <Card>
        <h2 className="section-title">Branding</h2>
        <p className="mt-1.5 secondary-text">Workspace name, tagline, and logo live in Brand.</p>
        <Link href="/app/brand" className="btn-secondary btn-pill mt-3">
          Open Brand
        </Link>
      </Card>

      <Card>
        <h2 className="section-title">Data export &amp; deletion</h2>
        <p className="mt-1.5 secondary-text">Your data is always exportable, never held hostage. Report exports are available from the Results tab once unlocked.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={exportEmployeesCsv} className="btn-secondary btn-pill">
            Export employee list (CSV)
          </button>
          <a href="mailto:privacy@safersay.com?subject=Account%20deletion%20request" className="btn-secondary btn-pill">
            Request account deletion
          </a>
        </div>
      </Card>
    </div>
  );
}
