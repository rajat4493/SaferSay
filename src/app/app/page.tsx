import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { PilotGuide } from "@/components/PilotGuide";

export default function Dashboard() {
  const workflow = [
    { step: "1", title: "Load people", text: "Upload a CSV with employee email, name, team, and location.", href: "/app/participants" },
    { step: "2", title: "Create survey", text: "Pick a template and create one secure token per employee.", href: "/app/surveys/new" },
    { step: "3", title: "Prepare invites", text: "Queue invitations from the participation store only.", href: "/app/integrations" },
    { step: "4", title: "Read report", text: "Reports unlock only when the safe response threshold is met.", href: "/app/reports" },
  ];

  return (
    <AppShell title="Home" subtitle="Start here. This page shows the shortest path from empty account to one safe survey cycle.">
      <PageGuide
        label="Start here"
        title="Run the first SaferSay pilot in four steps"
        body="For a small-company HR user, the product flow is simple: load employees, create a survey, prepare invites, then read the safe report after enough people respond."
        actions={[{ href: "/app/pilot", label: "Show my next click", primary: true }]}
      />
      <div className="mb-5">
        <PilotGuide compact />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workflow.map((item) => (
          <a key={item.title} href={item.href} className="rounded-[1.75rem] border border-[var(--brand-border)] bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-accent-soft)] text-sm font-semibold text-[var(--brand-accent)]">{item.step}</div>
            <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{item.text}</p>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
