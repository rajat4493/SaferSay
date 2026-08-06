"use client";

import { useState } from "react";
import { AppShell, Card } from "@/components/AppShell";
import { CreateSurveyCycle } from "@/components/CreateSurveyCycle";
import { PageGuide } from "@/components/PageGuide";
import { surveyTemplates } from "@/lib/templates";

export default function NewSurveyPage() {
  const [selected, setSelected] = useState(surveyTemplates[0].slug);
  const template = surveyTemplates.find((item) => item.slug === selected) ?? surveyTemplates[0];

  return (
    <AppShell title="New Survey" subtitle="Template first, then light editing, then launch.">
      <PageGuide
        label="Build"
        title="Pick a template and create your survey"
        body="Choose the closest template. When you click Create, SaferSay creates a draft survey and a secure invite link for each active employee, then takes you straight to Send."
        actions={[{ href: "/app/people", label: "Back: people" }]}
      />
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <h2 className="text-xl font-semibold">Choose template</h2>
          <div className="mt-4 space-y-2">
            {surveyTemplates.map((item) => (
              <button
                key={item.slug}
                onClick={() => setSelected(item.slug)}
                className={`w-full rounded-2xl border p-3 text-left text-sm ${selected === item.slug ? "border-[var(--brand-accent)] bg-[var(--brand-accent-soft)]" : "border-[var(--brand-border)] bg-white"}`}
              >
                <div className="font-semibold">{item.name}</div>
                <div className="mt-1 text-xs text-[var(--brand-muted)]">{item.duration}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">{template.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{template.description}</p>
          <p className="mt-4 text-sm text-[var(--brand-muted)]">{template.questions.length} questions — customize them below before launching the survey.</p>
        </Card>
      </div>
      <CreateSurveyCycle key={template.slug} templateSlug={template.slug} />
    </AppShell>
  );
}
