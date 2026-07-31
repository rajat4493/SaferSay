"use client";

import { AppShell } from "@/components/AppShell";
import { PilotGuide } from "@/components/PilotGuide";

export default function PilotPage() {
  return (
    <AppShell title="First Run" subtitle="A guided path for running one real confidential survey with a small company.">
      <PilotGuide />
    </AppShell>
  );
}
