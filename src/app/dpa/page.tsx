import { BackToAppLink } from "@/components/BackToAppLink";
import { LegalDraftBanner } from "@/components/LegalDraftBanner";

const LAST_UPDATED = "21 August 2026";
const LEGAL_ENTITY = process.env.LEGAL_ENTITY_NAME ?? "MindscopeAI LLP";
const PRIVACY_CONTACT = process.env.PRIVACY_CONTACT_EMAIL || "privacy@[your-domain]";

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BackToAppLink />
        <h1 className="page-title mt-4">Data Processing Agreement</h1>
        <p className="mt-1.5 secondary-text">Last updated {LAST_UPDATED}. Between {LEGAL_ENTITY} (&quot;Processor&quot;) and the Customer (&quot;Controller&quot;).</p>

        <div className="mt-6">
          <LegalDraftBanner />
        </div>

        <Section title="1. Purpose and scope">
          <P>
            This Data Processing Agreement (&quot;DPA&quot;) forms part of, and is incorporated into, the agreement between the
            Customer and {LEGAL_ENTITY} for use of the SaferSay platform (the &quot;Agreement&quot;). It applies whenever
            SaferSay processes personal data of the Customer&apos;s employees (&quot;Data Subjects&quot;) on the Customer&apos;s
            behalf, and reflects the Article 28 UK/EU GDPR requirements for processor agreements.
          </P>
        </Section>

        <Section title="2. Roles">
          <P>
            The Customer is the <B>Data Controller</B> for its employees&apos; personal data. {LEGAL_ENTITY} is the{" "}
            <B>Data Processor</B>, processing personal data only on the Customer&apos;s documented instructions, as set out
            in this DPA and the Agreement.
          </P>
        </Section>

        <Section title="3. Subject matter, duration, and nature of processing">
          <Ul
            items={[
              <>
                <B>Subject matter:</B> operating a survey platform that collects, aggregates, and reports employee feedback
                on the Customer&apos;s behalf.
              </>,
              <>
                <B>Duration:</B> for the term of the Agreement, plus the Customer&apos;s configured data retention period
                (default 24 months from each survey&apos;s closure, extendable per plan), after which data is deleted per
                Section 9.
              </>,
              <>
                <B>Nature of processing:</B> collection (CSV import), storage, pseudonymization via token-based access,
                aggregation, and reporting, subject to a minimum group-size threshold before any result is disclosed.
              </>,
            ]}
          />
        </Section>

        <Section title="4. Categories of data subjects and personal data">
          <Ul
            items={[
              <>
                <B>Data subjects:</B> the Customer&apos;s employees invited to participate in surveys.
              </>,
              <>
                <B>Categories of personal data:</B> work email, name, team/department, manager relationship (where
                provided), and survey response content. Response content is stored separately from identifying data with no
                direct database join between the two, and is disclosed to the Customer only in aggregate form once the
                minimum group-size threshold is met.
              </>,
              <>
                <B>Special category data:</B> the platform is not designed to solicit special category data (Art. 9 GDPR).
                Free-text responses are not filtered or redacted, so the Customer is responsible for the phrasing of any
                custom survey questions it authors.
              </>,
            ]}
          />
        </Section>

        <Section title="5. Processor obligations">
          <P>{LEGAL_ENTITY} shall:</P>
          <Ul
            items={[
              "Process personal data only on the Customer's documented instructions, including regarding international transfers, unless required to do otherwise by law (in which case we will inform the Customer, unless prohibited from doing so).",
              "Ensure persons authorized to process personal data are bound by confidentiality obligations.",
              "Implement appropriate technical and organizational measures per Article 32, including encryption in transit and at rest, role-based access control, per-tenant data isolation, audit logging of report access, and rate limiting on public endpoints.",
              "Assist the Customer, insofar as reasonably possible, in responding to Data Subject rights requests and in complying with its own Article 32-36 obligations (security, breach notification, DPIAs).",
              "Notify the Customer without undue delay after becoming aware of a personal data breach affecting the Customer's data, and provide reasonably requested information to help the Customer meet its own notification obligations.",
              "Make available information necessary to demonstrate compliance with this DPA and allow for, and contribute to, audits conducted by the Customer or an auditor mandated by the Customer, subject to reasonable notice and confidentiality.",
            ]}
          />
        </Section>

        <Section title="6. Sub-processors">
          <P>
            The Customer authorizes {LEGAL_ENTITY} to engage the following sub-processors, each bound by data protection
            terms no less protective than this DPA:
          </P>
          <Ul
            items={[
              "Supabase (database hosting and authentication, EU region)",
              "Vercel (application hosting)",
              "Resend (transactional email delivery)",
              "Stripe (payment processing)",
              "Sentry (error monitoring, where enabled)",
            ]}
          />
          <P>
            {LEGAL_ENTITY} will provide reasonable advance notice of any intended addition or replacement of a sub-processor,
            giving the Customer an opportunity to object on reasonable data protection grounds.
          </P>
        </Section>

        <Section title="7. International transfers">
          <P>
            Where personal data is transferred outside the UK/EEA, {LEGAL_ENTITY} will ensure an appropriate transfer
            mechanism is in place (such as the UK/EU Standard Contractual Clauses or an adequacy decision) before the
            transfer occurs.
          </P>
        </Section>

        <Section title="8. Data subject rights assistance">
          <P>
            Given the confidentiality architecture, {LEGAL_ENTITY} cannot itself identify which response belongs to which
            Data Subject. Where a Data Subject exercises a right (access, erasure, etc.) directly with {LEGAL_ENTITY}, we
            will refer them to the Customer and provide the Customer with reasonable technical assistance to fulfil the
            request using the Customer&apos;s own identity-side records.
          </P>
        </Section>

        <Section title="9. Deletion or return of data">
          <P>
            On termination of the Agreement, and subject to any legal retention obligation, {LEGAL_ENTITY} will delete or
            (at the Customer&apos;s written request, made before termination) return all personal data processed on the
            Customer&apos;s behalf within a commercially reasonable period, and will delete existing copies unless applicable
            law requires storage.
          </P>
        </Section>

        <Section title="10. Liability">
          <P>
            Each party&apos;s liability arising out of or related to this DPA is subject to the limitations of liability set out
            in the Agreement.
          </P>
        </Section>

        <Section title="11. Governing law">
          <P>
            This DPA is governed by the same governing law as the Agreement. <em>[Specific jurisdiction to be confirmed with counsel based on {LEGAL_ENTITY}&apos;s registered entity type and location.]</em>
          </P>
        </Section>

        <Section title="12. Contact">
          <P>
            Data protection queries relating to this DPA can be sent to{" "}
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
