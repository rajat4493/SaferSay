import { BackToAppLink } from "@/components/BackToAppLink";
import { LegalDraftBanner } from "@/components/LegalDraftBanner";

const LAST_UPDATED = "21 August 2026";
const LEGAL_ENTITY = process.env.LEGAL_ENTITY_NAME ?? "MindscopeAI LLP";
const PRIVACY_CONTACT = process.env.PRIVACY_CONTACT_EMAIL || "privacy@[your-domain]";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BackToAppLink />
        <h1 className="page-title mt-4">Privacy Notice</h1>
        <p className="mt-1.5 secondary-text">Last updated {LAST_UPDATED}. Operated by {LEGAL_ENTITY} (&quot;SaferSay&quot;, &quot;we&quot;, &quot;us&quot;).</p>

        <div className="mt-6">
          <LegalDraftBanner />
        </div>

        <Section title="1. Two kinds of people this notice covers">
          <P>
            SaferSay is a confidential employee-feedback platform. This notice covers personal data for two different groups,
            and we process each very differently:
          </P>
          <Ul
            items={[
              <>
                <B>Customer Users</B> — the HR/People leads, workspace admins, and survey creators at a company (a
                &quot;Customer&quot;) who sign in to SaferSay to build surveys and view aggregate results.
              </>,
              <>
                <B>Respondents</B> — the Customer&apos;s employees who receive a survey link and answer it. Respondents never
                create a SaferSay account or sign in.
              </>,
            ]}
          />
          <P>
            For Respondents, the Customer is the data controller and SaferSay is a data processor acting on the Customer&apos;s
            instructions (see our{" "}
            <a href="/dpa" className="font-medium text-[var(--green)] underline">
              Data Processing Agreement
            </a>
            ). If you are a Respondent with a question about how your employer is using SaferSay, please contact your employer
            first — we can only act on a Customer&apos;s instructions regarding their employees&apos; data.
          </P>
        </Section>

        <Section title="2. The confidentiality architecture, in plain terms">
          <P>
            SaferSay&apos;s entire design is built around one guarantee: <B>your employer sees grouped numbers, never who said
            what.</B> Concretely:
          </P>
          <Ul
            items={[
              "Identity data (who was invited, whether they responded) and response data (the actual answers) are stored in structurally separate tables with no direct join between them.",
              "A Respondent's survey link uses a random, single-use token — not their email address or name — to access the survey.",
              "Aggregate results are only ever shown once a minimum number of people have responded (5 by default), so no individual's answer can be reverse-engineered from a small group.",
              "Every time someone at a Customer views or exports a report, that access is logged in an audit trail the Customer's admins can review.",
            ]}
          />
          <P>A fuller technical explanation is published at /security.</P>
        </Section>

        <Section title="3. What we collect">
          <Ul
            items={[
              <>
                <B>From Customer Users:</B> name, work email, role, and authentication data (via Google or Microsoft
                sign-in — we never see or store your password).
              </>,
              <>
                <B>From Customers, about Respondents:</B> work email, name, team/department, and (optionally) manager email,
                imported by the Customer to issue survey invitations.
              </>,
              <>
                <B>From Respondents directly:</B> survey answers (numeric scores and free-text comments), stored separately
                from any identifying information as described above. If a Respondent uses the optional &quot;request support&quot;
                (SOS) feature, the message they write and their identity are sent to their employer&apos;s designated safety
                contact — this is the one deliberate, opt-in exception to the anonymity guarantee, and it requires explicit
                on-screen consent before anything is sent.
              </>,
              "Standard technical data (IP address, browser type, timestamps) for security and abuse prevention — see Section 8.",
            ]}
          />
        </Section>

        <Section title="4. Why we process this data (legal basis)">
          <Ul
            items={[
              "Performance of a contract — running surveys and delivering results is the service the Customer pays for.",
              "Legitimate interests — securing the platform, preventing abuse, and improving the product, balanced against your rights.",
              "Consent — specifically for the SOS/support feature, which only ever activates on the Respondent's explicit, informed action.",
              "Legal obligation — where we're required to retain or disclose data by law.",
            ]}
          />
        </Section>

        <Section title="5. How long we keep data">
          <P>
            Survey response and participation data is kept for a Customer-configurable retention period, defaulting to 24
            months from when a survey closes, after which it is automatically and permanently deleted. Customers can extend
            this period as part of their plan. Account data for Customer Users is kept for the life of the account plus a
            reasonable period for legal/accounting purposes after closure. Audit logs are retained longer than survey data,
            since they exist to demonstrate accountability, not to be forgotten on the same schedule.
          </P>
        </Section>

        <Section title="6. Who we share data with">
          <P>We use the following subprocessors to run the service. None of them can see individual survey answers linked to a name.</P>
          <Ul
            items={[
              "Supabase — database hosting and authentication (EU region).",
              "Vercel — application hosting.",
              "Resend — transactional email delivery (survey invitations and reminders).",
              "Stripe — payment processing (billing data only; never survey content).",
              "Sentry — error monitoring, where enabled, to catch bugs before they cause data problems.",
            ]}
          />
          <P>We do not sell personal data, and we do not use survey response content to train any AI/ML model.</P>
        </Section>

        <Section title="7. International data transfers">
          <P>
            Our default data residency is the EU. Where a subprocessor is based outside the EU/UK, we rely on Standard
            Contractual Clauses or an equivalent adequacy mechanism to ensure the same level of protection applies.
          </P>
        </Section>

        <Section title="8. Your rights">
          <P>
            Subject to applicable law (including UK/EU GDPR), you may have the right to access, correct, delete, restrict, or
            port your personal data, and to object to certain processing. Respondents should raise these requests with their
            employer in the first instance; Customer Users can contact us directly at{" "}
            <a href={`mailto:${PRIVACY_CONTACT}`} className="font-medium text-[var(--green)] underline">
              {PRIVACY_CONTACT}
            </a>
            .
          </P>
        </Section>

        <Section title="9. Security">
          <P>
            We use encryption in transit and at rest, role-based access control, per-tenant database isolation, audit
            logging, and rate limiting on public endpoints. No system is perfectly secure; see Section 11 for how we handle
            incidents.
          </P>
        </Section>

        <Section title="10. Children's data">
          <P>SaferSay is a workplace product and is not directed at, or knowingly used by, children.</P>
        </Section>

        <Section title="11. Data breach notification">
          <P>
            If we become aware of a personal data breach affecting Customer data, we will notify the affected Customer
            without undue delay, consistent with our obligations under the Data Processing Agreement.
          </P>
        </Section>

        <Section title="12. Changes to this notice">
          <P>We&apos;ll update the &quot;last updated&quot; date above when this notice changes, and notify Customers of material changes.</P>
        </Section>

        <Section title="13. Contact">
          <P>
            Questions about this notice can be sent to{" "}
            <a href={`mailto:${PRIVACY_CONTACT}`} className="font-medium text-[var(--green)] underline">
              {PRIVACY_CONTACT}
            </a>
            .
          </P>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="section-title">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="secondary-text">{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-[var(--ink)]">{children}</span>;
}

function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index} className="secondary-text">
          {item}
        </li>
      ))}
    </ul>
  );
}
