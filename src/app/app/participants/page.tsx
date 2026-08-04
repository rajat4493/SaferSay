"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmployeeCsvImport } from "@/components/EmployeeCsvImport";
import { EmployeeDirectory } from "@/components/EmployeeDirectory";
import { PageGuide } from "@/components/PageGuide";

export default function ParticipantsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppShell title="Participants" subtitle="Participation lives here. Answers do not.">
      <PageGuide
        label="Step 1"
        title="Load the people who should receive the survey"
        body="This page is only for employee identity and participation status. It can know who received an invite link and who used it, but it never stores answers."
        actions={[{ href: "/app/surveys/new", label: "Next: create survey", primary: true }]}
      />
      <EmployeeCsvImport onImported={() => setRefreshKey((key) => key + 1)} />
      <EmployeeDirectory refreshKey={refreshKey} />
    </AppShell>
  );
}
