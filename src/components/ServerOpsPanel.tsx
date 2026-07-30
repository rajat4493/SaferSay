"use client";

import { useState } from "react";
import { Card } from "@/components/AppShell";

type ApiResult = Record<string, unknown>;

export function ServerOpsPanel() {
  const [result, setResult] = useState<ApiResult | null>(null);

  async function callApi(path: string, body?: object) {
    const response = await fetch(path, {
      method: path === "/api/report" ? "GET" : "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setResult((await response.json()) as ApiResult);
  }

  return (
    <Card className="mt-5">
      <h2 className="text-xl font-semibold">Server-side validation flow</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
        These actions use server APIs, not browser-local demo state. Without external keys,
        payment and email run in safe mock mode.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Action label="Seed participants" onClick={() => callApi("/api/cycles/seed")} />
        <Action label="Mock payment" onClick={() => callApi("/api/cycles/pay", { mockSuccess: true })} />
        <Action label="Launch paid cycle" onClick={() => callApi("/api/cycles/launch")} />
        <Action label="Send invites" onClick={() => callApi("/api/emails/invites")} />
        <Action label="Send reminders" onClick={() => callApi("/api/emails/reminders")} />
        <Action label="Read report" onClick={() => callApi("/api/report")} />
      </div>
      {result && (
        <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-[#161616] p-4 text-xs leading-5 text-white">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </Card>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
      {label}
    </button>
  );
}
