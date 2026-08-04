"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

type Info = { isImpersonating: boolean; tenantName: string } | null;

export function ImpersonationBanner() {
  const [info, setInfo] = useState<Info>(null);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok || !data.isImpersonating) return;
        setInfo({ isImpersonating: true, tenantName: data.tenant?.name ?? "another workspace" });
      })
      .catch(() => undefined);
  }, []);

  if (!info?.isImpersonating) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-pill)] border border-[#e8b8a8] bg-[#f6e2df] px-4 py-2 text-sm font-semibold text-[#9a392d]">
      <ShieldAlert size={16} />
      Viewing <span className="underline">{info.tenantName}</span> as SaferSay Owner — use the switcher above to return to your own workspace.
    </div>
  );
}
