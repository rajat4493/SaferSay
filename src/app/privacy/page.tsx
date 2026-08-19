import { BackToAppLink } from "@/components/BackToAppLink";

const sections: Array<[string, React.ReactNode]> = [
  [
    "Who is the controller, who is the processor",
    <>
      SaferSay is operated by MindscopeAI LLP. When your employer runs a survey through SaferSay, your{" "}
      <strong>employer is the data controller</strong> for that survey -- they decide who is surveyed, what
      questions are asked, and who on their team can view protected results. MindscopeAI LLP acts as a{" "}
      <strong>data processor</strong>, processing data only on the employer&apos;s instructions and only for the
      purposes described here. If you have a question about a specific survey, your employer (not MindscopeAI LLP)
      is usually the right first contact -- but you can also reach us directly (see below).
    </>,
  ],
  [
    "What we collect, and how it's kept apart",
    <>
      SaferSay is built around a hard technical separation between two categories of data, described in full on
      the <a href="/security" className="underline">security page</a>:
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><strong>Identity data</strong> -- your name, email, team, and participation status (whether you&apos;ve completed a survey), used only to confirm eligibility and prevent duplicate responses.</li>
        <li><strong>Response data</strong> -- your answers, stored with no name, email, employee ID, IP address, or user agent attached.</li>
      </ul>
      These live in separate database schemas with database-level access controls preventing identity data from
      ever being joined to response content, except in the one narrow, consent-based exception below.
    </>,
  ],
  [
    "The one exception: voluntary safety reports",
    <>
      If a survey includes an &quot;I need help&quot; option and you choose to use it, you are explicitly told
      beforehand that doing so shares your name, email, and message with your employer&apos;s designated safety
      contact, separately from your anonymous survey answers, and asked to confirm before sending. This is the
      only path by which your identity is ever linked to anything you&apos;ve written.
    </>,
  ],
  [
    "How long we keep it",
    <>
      Response data is retained for 24 months from collection by default; your employer can configure a different
      retention period in their workspace settings. Identity data (the employee list) is retained for as long as
      your employer keeps you as an active participant, or until your employer removes you or requests deletion.
    </>,
  ],
  [
    "Where it's stored",
    <>
      Data residency defaults to the EU and is configurable per workspace by the employer. Sub-processors used to
      deliver the service are listed below.
    </>,
  ],
  [
    "Sub-processors",
    <>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li><strong>Supabase</strong> -- primary database hosting</li>
        <li><strong>Vercel</strong> -- application hosting and content delivery</li>
        <li><strong>Resend</strong> -- transactional email (invite and reminder delivery), unless your employer has configured their own mail server</li>
        <li><strong>Stripe</strong> -- billing and payment processing (receives billing metadata only -- never survey answers or participant tokens)</li>
      </ul>
      We will update this list, and notify customers in advance, before adding or replacing a sub-processor that
      handles personal data.
    </>,
  ],
  [
    "Your rights",
    <>
      Depending on your jurisdiction, you may have the right to access, correct, or request deletion of your
      personal data. Because your employer is the controller, requests are generally directed to them first;
      MindscopeAI LLP will assist the employer in fulfilling verified requests within the timeframe required by
      applicable law.
    </>,
  ],
  [
    "Contact",
    <>
      Questions about this notice, or requests you&apos;d like to route to us directly:{" "}
      <a href="mailto:privacy@safersay.com" className="underline">privacy@safersay.com</a>.
    </>,
  ],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BackToAppLink />

        <h1 className="page-title mt-4">Privacy Notice</h1>
        <p className="mt-1.5 secondary-text">Last reviewed: draft, pending final legal sign-off. See note below.</p>

        <div className="card mt-4 border-[var(--amber-border,#e8c468)] bg-[var(--amber-bg,#fdf6e3)]">
          <p className="text-[13px] leading-[1.6] text-[var(--ink)]">
            <strong>This page reflects the platform&apos;s actual architecture and data-handling behavior</strong> --
            it is not placeholder text. It has not yet had final review by qualified legal counsel and should not
            be treated as a binding privacy notice until that review is complete.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {sections.map(([title, body]) => (
            <div key={title} className="card">
              <h2 className="section-title">{title}</h2>
              <div className="mt-2 secondary-text leading-[1.6]">{body}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
