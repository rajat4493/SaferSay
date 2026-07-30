import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, Card } from "@/components/AppShell";
import { getTemplate } from "@/lib/templates";

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  return (
    <AppShell title={template.name} subtitle={template.description}>
      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">{template.category}</p>
          <h2 className="mt-2 text-2xl font-semibold">{template.duration}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">All questions are original and method-grounded. Optional open text is suppressed in reporting until the threshold is safe.</p>
          <Link href="/app/surveys/new" className="mt-6 inline-flex rounded-full bg-[var(--brand-accent)] px-5 py-3 text-sm font-semibold text-white">
            Use this template
          </Link>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Question preview</h2>
          <div className="mt-4 space-y-3">
            {template.questions.map((question, index) => (
              <div key={question.id} className="rounded-2xl bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                  {index + 1}. {question.construct} · {question.type.replace("_", " ")}
                </div>
                <p className="mt-2 text-sm font-medium">{question.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
