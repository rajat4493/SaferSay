"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useTenantSession } from "@/lib/useTenantSession";

export function ImpersonationBanner() {
  const router = useRouter();
  const { info } = useTenantSession();
  const [returning, setReturning] = useState(false);

  async function returnToOwnWorkspace() {
    setReturning(true);
    await fetch("/api/super-admin/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    router.push("/app");
    router.refresh();
  }

  if (!info?.isImpersonating) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--red-border)] bg-[var(--red-bg)] px-4 py-2.5 text-[13px] font-medium text-[var(--red)]">
      <span className="flex items-center gap-2">
        <ShieldAlert size={15} strokeWidth={1.8} />
        Viewing <span className="underline">{info.tenantName}</span> as SaferSay Owner
      </span>
      <button
        onClick={returnToOwnWorkspace}
        disabled={returning}
        className="shrink-0 whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--red)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {returning ? "Returning..." : "Return to my workspace"}
      </button>
    </div>
  );
}
