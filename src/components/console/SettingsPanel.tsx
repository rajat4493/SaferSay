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
    <div className="space-y-[9px]">
      <h1 className="page-title">Settings</h1>

      <ConsoleCard>
        <h2 className="meta-label">Platform admins</h2>
        {settings === undefined ? (
          <p className="mt-3 secondary-text">Loading...</p>
        ) : settings === null || settings.platformOwners.length === 0 ? (
          <p className="mt-3 secondary-text">No SUPER_ADMIN_EMAILS configured.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--ink)]">
            {settings.platformOwners.map((email) => (
              <li key={email} className="rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2">
                {email}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-[var(--ink-faint)]">Managed via the SUPER_ADMIN_EMAILS environment variable — not yet editable from this screen.</p>
      </ConsoleCard>

      <ConsoleCard>
        <h2 className="meta-label">Global config</h2>
        {settings ? (
          <dl className="mt-3 space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--ink-mid)]">Runtime mode</dt>
              <dd className="font-medium text-[var(--ink)]">{settings.runtimeMode}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--ink-mid)]">Default data residency</dt>
              <dd className="font-medium text-[var(--ink)]">{settings.dataResidencyDefault}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--ink-mid)]">Legal entity</dt>
              <dd className="font-medium text-[var(--ink)]">{settings.legalEntityName ?? "—"}</dd>
            </div>
          </dl>
        ) : null}
      </ConsoleCard>
    </div>
  );
}
