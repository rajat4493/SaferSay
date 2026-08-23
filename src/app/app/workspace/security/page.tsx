import { AppShell, Card } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";
import { CopyLinkButton } from "@/components/CopyLinkButton";

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
    <AppShell
      title="How we protect your team's answers"
      subtitle="Plain-English explanation for HR leads, DPOs, and employee representatives."
    >
      <ConfidentialitySeal />
      <div className="mb-[9px]">
        <CopyLinkButton />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {controls.map(([title, text]) => (
          <Card key={title}>
            <h2 className="section-title">{title}</h2>
            <p className="mt-2 secondary-text">{text}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
