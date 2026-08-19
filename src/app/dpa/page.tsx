import { BackToAppLink } from "@/components/BackToAppLink";

const clauses: Array<[string, React.ReactNode]> = [
  [
    "1. Parties and roles",
    <>
      This Data Processing Agreement is between the customer entity that has signed up for SaferSay
      (&quot;<strong>Customer</strong>&quot;, acting as data controller for its employees&apos; survey participation
      and response data) and MindscopeAI LLP (&quot;<strong>Processor</strong>&quot;, operating SaferSay).
    </>,
  ],
  [
    "2. Subject matter and duration",
    <>
      Processor will process personal data on Customer&apos;s behalf solely to provide the SaferSay service, for
      the duration of Customer&apos;s subscription plus any agreed post-termination export window (see clause 8).
    </>,
  ],
  [
    "3. Categories of data and data subjects",
    <>
      Identity data (name, email, team, participation status) and, where a data subject voluntarily uses the
      &quot;I need help&quot; safety-escalation feature, their message and identity linked to that one report.
      Response data (survey answers) is processed without any identifying fields attached. Data subjects are
      Customer&apos;s employees invited to participate in surveys.
    </>,
  ],
  [
    "4. Processing only on instructions",
    <>
      Processor will process personal data only on Customer&apos;s documented instructions -- as configured through
      the SaferSay application (survey creation, employee import, confidentiality threshold, safety contact) --
      unless required otherwise by applicable law, in which case Processor will inform Customer before processing,
      unless prohibited from doing so.
    </>,
  ],
  [
    "5. Sub-processors",
    <>
      Processor uses the following sub-processors: Supabase (database hosting), Vercel (application hosting),
      Resend (transactional email, unless Customer configures its own SMTP server), and Stripe (billing). Processor
      will give Customer reasonable advance notice before adding or replacing a sub-processor that will process
      personal data, and Customer may object on reasonable data-protection grounds.
    </>,
  ],
  [
    "6. Security measures",
    <>
      Processor maintains the technical measures described at <a href="/security" className="underline">/security</a>,
      including: database-level schema separation between identity and response data with a database-enforced
      guarantee that identity-shaped columns can never be added to response tables; row-level security scoping
      every query to the requesting tenant; k-anonymity gating that suppresses any result group below Customer&apos;s
      configured threshold; and encryption at rest for stored credentials (API keys, mail-server passwords).
    </>,
  ],
  [
    "7. Assistance with data subject requests and breach notification",
    <>
      Processor will provide reasonable assistance to Customer in responding to data subject access, rectification,
      or erasure requests. Processor will notify Customer without undue delay, and in any case within 72 hours of
      becoming aware, of any personal data breach affecting Customer&apos;s data.
    </>,
  ],
  [
    "8. Deletion or return of data",
    <>
      On termination, Customer may export its data (employee list, survey configuration, and any already-unlocked
      protected results) for 30 days. After that window, or on Customer&apos;s written request, Processor will
      delete Customer&apos;s data, including backups, within a commercially reasonable period.
    </>,
  ],
  [
    "9. Audit rights",
    <>
      Processor will make available information reasonably necessary to demonstrate compliance with this DPA and
      will allow for, and contribute to, audits conducted by Customer or an auditor mandated by Customer, subject
      to reasonable notice and confidentiality.
    </>,
  ],
  [
    "10. International transfers",
    <>
      Data residency defaults to the EU and is configurable per workspace. Where a transfer outside the EEA is
      required, Processor will rely on an appropriate transfer mechanism (such as Standard Contractual Clauses).
    </>,
  ],
];

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BackToAppLink />

        <h1 className="page-title mt-4">Data Processing Agreement</h1>
        <p className="mt-1.5 secondary-text">Last reviewed: draft, pending final legal sign-off. See note below.</p>

        <div className="card mt-4 border-[var(--amber-border,#e8c468)] bg-[var(--amber-bg,#fdf6e3)]">
          <p className="text-[13px] leading-[1.6] text-[var(--ink)]">
            <strong>This reflects the platform&apos;s actual processing behavior and sub-processor list</strong> --
            it is not placeholder text. It has not yet had final review by qualified legal counsel and is not a
            substitute for a signed, negotiated DPA. Contact us to execute one for your workspace.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {clauses.map(([title, body]) => (
            <div key={title} className="card">
              <h2 className="section-title">{title}</h2>
              <div className="mt-2 secondary-text leading-[1.6]">{body}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 secondary-text">
          Requests: <a href="mailto:privacy@safersay.com" className="underline">privacy@safersay.com</a>.
        </p>
      </div>
    </main>
  );
}
