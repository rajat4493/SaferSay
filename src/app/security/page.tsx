import { CopyLinkButton } from "@/components/CopyLinkButton";

// Public, unauthenticated by design -- an HR admin forwards this link
// straight to a DPO or works-council rep, who has no SaferSay account.
// No tenant data on this page, generic architecture claims only.
const controls = [
  ["Identity store", "Sign-in, eligibility, reminder status, token issue state. No answers."],
  ["Response store", "Answers, cycle id, safe tags only. No name, email, employee id, IP, or user agent."],
  ["Minimum group size", "Reports and exports suppress groups below the threshold set in Settings."],
  ["Reminder isolation", "Reminders target unspent participation tokens only; they never read answers."],
  ["Payment isolation", "Stripe receives billing metadata only, never employee answers or survey tokens."],
  ["No emotion inference", "No psychological or emotional state classification, now or later."],
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="page-title">How we protect your team&apos;s answers</h1>
        <p className="mt-1.5 secondary-text">Plain-English explanation for HR leads, DPOs, and employee representatives.</p>

        <div className="mb-[9px] mt-4">
          <CopyLinkButton />
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          {controls.map(([title, text]) => (
            <div key={title} className="card">
              <h2 className="section-title">{title}</h2>
              <p className="mt-2 secondary-text">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
