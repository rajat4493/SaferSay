import Link from "next/link";
import { AppShell, Card } from "@/components/AppShell";

const controls = [
  ["Identity store", "Sign-in, eligibility, reminder status, token issue state. No answers."],
  ["Response store", "Answers, cycle id, safe tags only. No name, email, employee id, IP, or user agent."],
  ["Minimum group size", "Reports and exports suppress groups below five."],
  ["Reminder isolation", "Reminders target unspent participation tokens only; they never read answers."],
  ["Payment isolation", "Stripe receives billing metadata only, never employee answers or survey tokens."],
  ["No emotion inference", "No psychological or emotional state classification, now or later."],
];

export default function SecurityPage() {
  return (
    <AppShell title="Security & Confidentiality" subtitle="Plain-English controls for HR, with architecture guardrails for production.">
      <div className="grid gap-4 md:grid-cols-2">
        {controls.map(([title, text]) => (
          <Card key={title}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{text}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <h2 className="text-xl font-semibold">Production safety status</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
          Local/mock mode is for development only. Production requires Supabase EU Postgres,
          real auth, Stripe, Resend, token secret, and privacy contact configured.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/app/readiness" className="rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white">Check go-live readiness</Link>
          <Link href="/privacy" className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">Privacy notice</Link>
          <Link href="/dpa" className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">DPA placeholder</Link>
        </div>
      </Card>
    </AppShell>
  );
}
