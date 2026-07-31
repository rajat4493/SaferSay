"use client";

import { AppShell, Card } from "@/components/AppShell";
import { EmployeeCsvImport } from "@/components/EmployeeCsvImport";
import { useSurveyData } from "@/components/DataProvider";

export default function ParticipantsPage() {
  const { data } = useSurveyData();
  const issued = data.identity.participants.filter((item) => item.status === "issued").length;
  const spent = data.identity.participants.filter((item) => item.status === "spent").length;

  return (
    <AppShell title="Participants" subtitle="Participation lives here. Answers do not.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><h2 className="text-3xl font-semibold">{data.identity.employees.length}</h2><p className="text-sm text-[var(--brand-muted)]">Employees loaded</p></Card>
        <Card><h2 className="text-3xl font-semibold">{issued}</h2><p className="text-sm text-[var(--brand-muted)]">Reminder targets</p></Card>
        <Card><h2 className="text-3xl font-semibold">{spent}</h2><p className="text-sm text-[var(--brand-muted)]">Submitted tokens</p></Card>
      </div>
      <EmployeeCsvImport />
      <Card className="mt-4">
        <h2 className="text-xl font-semibold">Identity/participation store</h2>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">This table can know who has participated. It never contains answer content.</p>
        <div className="mt-4 max-h-80 overflow-auto rounded-2xl bg-white">
          {data.identity.employees.slice(0, 12).map((employee) => (
            <div key={employee.id} className="grid grid-cols-3 gap-3 border-b border-[var(--brand-border)] p-3 text-sm last:border-b-0">
              <span className="font-semibold">{employee.name}</span>
              <span className="text-[var(--brand-muted)]">{employee.email}</span>
              <span className="text-[var(--brand-muted)]">{employee.team}</span>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
