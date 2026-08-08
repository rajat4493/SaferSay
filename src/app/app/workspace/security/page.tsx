import Link from "next/link";
import { AppShell, Card } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";

const controls = [
  ["Identity store", "Sign-in, eligibility, reminder status, token issue state. No answers."],
  ["Response store", "Answers, cycle id, safe tags only. No name, email, employee id, IP, or user agent."],
  ["Minimum group size", "Reports and exports suppress groups below the threshold set in Settings."],
  ["Reminder isolation", "Reminders target unspent participation tokens only; they never read answers."],
  ["Payment isolation", "Stripe receives billing metadata only, never employee answers or survey tokens."],
  ["No emotion inference", "No psychological or emotional state classification, now or later."],
];

export default function WorkspaceSecurityPage() {
  return (
    <AppShell title="Security & Confidentiality" subtitle="Plain-English controls for HR, with architecture guardrails for production.">
      <ConfidentialitySeal />
      <div className="grid gap-2.5 md:grid-cols-2">
        {controls.map(([title, text]) => (
          <Card key={title}>
            <h2 className="section-title">{title}</h2>
            <p className="mt-2 secondary-text">{text}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-[9px]">
        <h2 className="section-title">Production safety status</h2>
        <p className="mt-2 secondary-text">
          Local/mock mode is for development only. Production requires Supabase EU Postgres, real auth, Stripe, Resend, token secret, and
          privacy contact configured.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/privacy" className="btn-secondary">
            Privacy notice
          </Link>
          <Link href="/dpa" className="btn-secondary">
            DPA placeholder
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
