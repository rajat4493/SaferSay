"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell, Card } from "@/components/AppShell";
import { CreateSurveyCycle } from "@/components/CreateSurveyCycle";
import { PageGuide } from "@/components/PageGuide";
import { surveyTemplates } from "@/lib/templates";
import { canCreateSurvey } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

export default function NewSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTemplate = searchParams.get("template");
  const [selected, setSelected] = useState(
    (requestedTemplate && surveyTemplates.some((item) => item.slug === requestedTemplate) ? requestedTemplate : surveyTemplates[0].slug),
  );
  const template = surveyTemplates.find((item) => item.slug === selected) ?? surveyTemplates[0];
  const [, startTransition] = useTransition();

  useEffect(() => {
    async function checkAccess() {
      const sessionResponse = await fetch("/api/tenants/current");
      const sessionData = (await sessionResponse.json().catch(() => ({ ok: false }))) as { ok?: boolean; role?: UserRole };
      if (sessionData.ok && !canCreateSurvey(sessionData.role as UserRole)) {
        router.replace("/app");
        return;
      }

      const response = await fetch("/api/employees?limit=1");
      const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; total?: number };
      if (data.ok && data.total === 0) router.replace("/app/people");
    }
    startTransition(() => {
      void checkAccess();
    });
  }, [router, startTransition]);

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
      <CreateSurveyCycle key={template.slug} templateSlug={template.slug} />
    </AppShell>
  );
}
