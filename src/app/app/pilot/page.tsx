"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PilotGuide } from "@/components/PilotGuide";
import { canCreateSurvey } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

export default function PilotPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean; role?: UserRole; firstRunCompleted?: boolean }) => {
        if (!data.ok || data.firstRunCompleted || !data.role || !canCreateSurvey(data.role)) {
          router.replace("/app");
          return;
        }
        setAllowed(true);
      })
      .catch(() => router.replace("/app"));
  }, [router]);

  if (!allowed) return null;

  return (
    <AppShell title="Your first survey" subtitle="A guided path from adding people to protected results.">
      <PilotGuide />
    </AppShell>
  );
}
