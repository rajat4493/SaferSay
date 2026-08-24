"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Card } from "@/components/AppShell";
import { CreateSurveyCycle } from "@/components/CreateSurveyCycle";
import { PageGuide } from "@/components/PageGuide";
import { surveyTemplates } from "@/lib/templates";

export default function NewSurveyPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(surveyTemplates[0].slug);
  const template = surveyTemplates.find((item) => item.slug === selected) ?? surveyTemplates[0];
  const [, startTransition] = useTransition();
  const [accessChecked, setAccessChecked] = useState(false);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [employeeCountError, setEmployeeCountError] = useState(false);

  useEffect(() => {
    async function checkEmployees() {
      try {
        const response = await fetch("/api/employees?limit=1");
        const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; total?: number };
        if (data.ok && data.total === 0) {
          router.replace("/app/people");
          return;
        }
        if (data.ok) setEmployeeCount(data.total ?? 0);
        else setEmployeeCountError(true);
      } catch {
        setEmployeeCountError(true);
      }
      setAccessChecked(true);
    }
    startTransition(() => {
      void checkEmployees();
    });
  }, [router, startTransition]);

  if (!accessChecked) return null;

  return (
    <AppShell title="New survey" subtitle="Template first, then light editing, then launch.">
      <PageGuide
        label="Build"
        title="Pick a template and create your survey"
        body="Choose the closest template. When you click Create, SaferSay creates a draft survey and a secure invite link for each active employee, then takes you straight to Send."
        actions={[{ href: "/app/people", label: "Back: people" }]}
      />
      <div className="grid gap-2.5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <h2 className="section-title">Choose template</h2>
          <div className="mt-4 space-y-2">
            {surveyTemplates.map((item) => (
              <button
                key={item.slug}
                onClick={() => setSelected(item.slug)}
                className={`w-full rounded-[var(--radius-input)] border p-3 text-left text-[13px] transition ${
                  selected === item.slug ? "border-[var(--ink)] bg-[var(--bg-active)]" : "border-[var(--border)] bg-white hover:border-[var(--border-hover)]"
                }`}
              >
                <div className="font-medium text-[var(--ink)]">{item.name}</div>
                <div className="mt-1 text-xs text-[var(--ink-faint)]">{item.duration}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="section-title">{template.name}</h2>
          <p className="mt-2 secondary-text">{template.description}</p>
          <p className="mt-4 secondary-text">{template.questions.length} questions — customize them below before launching the survey.</p>
        </Card>
      </div>
      {employeeCount !== null ? (
        <Card className="mt-2.5">
          <p className="meta-label">Participant data check</p>
          <p className="mt-2 secondary-text">
            {employeeCount} active people will receive a secure link. {employeeCount >= 5 ? "Your organisation can reach the minimum protected-report threshold." : "This survey can launch, but results remain protected until at least five people submit."}
          </p>
        </Card>
      ) : null}
      {employeeCountError ? (
        <Card className="mt-2.5">
          <p className="section-title">Couldn&apos;t load participant data</p>
          <p className="mt-2 secondary-text">Refresh the page before creating a survey so invite and confidentiality checks use the real employee count.</p>
        </Card>
      ) : (
        <CreateSurveyCycle key={template.slug} templateSlug={template.slug} activeEmployees={employeeCount ?? 0} />
      )}
    </AppShell>
  );
}
