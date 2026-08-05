"use client";

import { useEffect, useState } from "react";
import { ConsoleCard } from "@/components/console/ConsoleUI";

type Settings = {
  platformOwners: string[];
  runtimeMode: string;
  dataResidencyDefault: string;
  legalEntityName: string | null;
};

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/super-admin/settings")
      .then((response) => response.json())
      .then((data) => setSettings(data.ok ? data.settings : null))
      .catch(() => setSettings(null));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <ConsoleCard>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Platform admins</h2>
        {settings === undefined ? (
          <p className="mt-3 text-sm text-[var(--brand-muted)]">Loading...</p>
        ) : settings === null || settings.platformOwners.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--brand-muted)]">No SUPER_ADMIN_EMAILS configured.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {settings.platformOwners.map((email) => (
              <li key={email} className="rounded-xl border border-[var(--brand-border)] px-3 py-2">
                {email}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-[var(--brand-muted)]">
          Managed via the SUPER_ADMIN_EMAILS environment variable — not yet editable from this screen.
        </p>
      </ConsoleCard>

      <ConsoleCard>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Global config</h2>
        {settings ? (
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--brand-muted)]">Runtime mode</dt>
              <dd className="font-semibold">{settings.runtimeMode}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--brand-muted)]">Default data residency</dt>
              <dd className="font-semibold">{settings.dataResidencyDefault}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--brand-muted)]">Legal entity</dt>
              <dd className="font-semibold">{settings.legalEntityName ?? "—"}</dd>
            </div>
          </dl>
        ) : null}
      </ConsoleCard>
    </div>
  );
}
