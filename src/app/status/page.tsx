"use client";

import { useEffect, useState } from "react";
import { BackToAppLink } from "@/components/BackToAppLink";

type StatusResponse = { ok: boolean; app: string; database: string; checkedAt: string; responseTimeMs: number };

function Row({ label, up }: { label: string; up: boolean | null }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5">
      <span className="text-[14px] text-[var(--ink)]">{label}</span>
      <span
        className={`flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.04em] ${
          up === null ? "text-[var(--ink-faint)]" : up ? "text-[var(--green)]" : "text-[var(--red)]"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${up === null ? "bg-[var(--ink-faint)]" : up ? "bg-[var(--green)]" : "bg-[var(--red)]"}`}
        />
        {up === null ? "Checking..." : up ? "Operational" : "Down"}
      </span>
    </div>
  );
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState(false);

  function check() {
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: StatusResponse) => {
        setStatus(data);
        setError(false);
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-xl">
        <BackToAppLink />
        <h1 className="page-title mt-4">SaferSay status</h1>
        <p className="mt-1.5 secondary-text">
          Live, self-reported status -- not a historical uptime record. Refreshes every 30 seconds.
        </p>

        <div className="card mt-4 space-y-2">
          <Row label="Application" up={status ? status.app === "up" : error ? false : null} />
          <Row label="Database" up={status ? status.database === "up" : error ? false : null} />
        </div>

        {status ? (
          <p className="mt-3 text-[12px] text-[var(--ink-faint)]">
            Last checked {new Date(status.checkedAt).toLocaleTimeString()} -- {status.responseTimeMs}ms response time.
          </p>
        ) : null}
      </div>
    </main>
  );
}
