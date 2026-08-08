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
