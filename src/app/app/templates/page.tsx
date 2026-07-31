import Link from "next/link";
import { AppShell, Card } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { surveyTemplates } from "@/lib/templates";

export default function TemplatesPage() {
  return (
    <AppShell title="Templates" subtitle="Credible question banks, ready to launch without survey-design expertise.">
      <PageGuide
        title="Use templates when HR does not want to design a survey from scratch"
        body="Templates are the starting question sets. Preview one here, then create the actual survey cycle from the Create survey page."
        actions={[{ href: "/app/surveys/new", label: "Create from template", primary: true }]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {surveyTemplates.map((template) => (
          <Card key={template.slug}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">{template.category}</p>
                <h2 className="mt-2 text-xl font-semibold">{template.name}</h2>
              </div>
              <span className="rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">{template.duration}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">{template.description}</p>
            <div className="mt-4 text-sm font-semibold">{template.questions.length} questions</div>
            <Link href={`/app/templates/${template.slug}`} className="mt-5 inline-flex rounded-full bg-[var(--brand-ink)] px-4 py-2 text-sm font-semibold text-white">
              Preview template
            </Link>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
