"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmployeeCsvImport } from "@/components/EmployeeCsvImport";
import { EmployeeDirectory } from "@/components/EmployeeDirectory";
import { PageGuide } from "@/components/PageGuide";

export default function PeoplePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppShell
      title="People"
      subtitle="Participation lives here. Answers do not."
      headerActions={
        <Link href="/app/people/groups" className="btn-secondary">
          Manage groups
        </Link>
      }
    >
      <PageGuide
        label="Step 1"
        title="Load the people who should receive surveys"
        body="Import a CSV with employee email, name, team, and location. Use this page to add or deactivate people."
        actions={[{ href: "/app/surveys/new", label: "Next: create survey", primary: true }]}
      />
      <EmployeeCsvImport onImported={() => setRefreshKey((key) => key + 1)} />
      <EmployeeDirectory refreshKey={refreshKey} />
    </AppShell>
  );
}
