import { BackToAppLink } from "@/components/BackToAppLink";
import { LegalDraftBanner } from "@/components/LegalDraftBanner";

const LAST_UPDATED = "21 August 2026";
const LEGAL_ENTITY = process.env.LEGAL_ENTITY_NAME ?? "MindscopeAI LLP";
const PRIVACY_CONTACT = process.env.PRIVACY_CONTACT_EMAIL || "privacy@[your-domain]";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BackToAppLink />
        <h1 className="page-title mt-4">Terms of Service</h1>
        <p className="mt-1.5 secondary-text">Last updated {LAST_UPDATED}. These terms govern use of SaferSay, operated by {LEGAL_ENTITY}.</p>

        <div className="mt-6">
          <LegalDraftBanner />
        </div>

        <Section title="1. Acceptance of these terms">
          <P>
            By creating a SaferSay account or otherwise using the service, you (&quot;Customer&quot;, &quot;you&quot;) agree to
            these Terms of Service (&quot;Terms&quot;). If you&apos;re accepting on behalf of an organization, you confirm you
            have authority to bind that organization.
          </P>
        </Section>

        <Section title="2. The service">
          <P>
            SaferSay is a confidential employee-feedback survey platform. Its core commitment is architectural, not just
            promised in writing: employee identity data and survey response data are stored separately, individual
            responses are never disclosed, and aggregate results are withheld until a minimum group size is met. Full
            technical detail is published at /security.
          </P>
        </Section>

        <Section title="3. Accounts and eligibility">
          <Ul
            items={[
              "You must provide accurate information when creating an account and keep your login credentials secure.",
              "You're responsible for all activity under your account, and for the accuracy of any employee data you import.",
              "SaferSay authenticates Customer Users via Google or Microsoft sign-in; we never see or store your password.",
            ]}
          />
        </Section>

        <Section title="4. Subscription, fees, and payment">
          <P>
            Fees, billing cycle, and payment terms are as set out at checkout or in an applicable order form. Payments are
            processed by Stripe; SaferSay does not store your card details. Fees are non-refundable except as required by
            law or expressly stated otherwise. <em>[Pricing model and cancellation terms to be finalized before this section is relied on.]</em>
          </P>
        </Section>

        <Section title="5. Your data and our processing of it">
          <P>
            As between you and SaferSay, you own the employee data you import and the survey responses collected through
            your account. Our processing of your employees&apos; personal data is governed by our{" "}
            <a href="/dpa" className="font-medium text-[var(--green)] underline">
              Data Processing Agreement
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-medium text-[var(--green)] underline">
              Privacy Notice
            </a>
            , both incorporated into these Terms by reference.
          </P>
        </Section>

        <Section title="6. Acceptable use">
          <P>You agree not to:</P>
          <Ul
            items={[
              "Use SaferSay to attempt to identify an individual respondent from aggregate results, or to circumvent the minimum group-size protection.",
              "Import employee data you don't have a lawful basis to process.",
              "Use the platform to harass, discriminate against, or retaliate against employees based on survey participation or responses.",
              "Attempt to probe, scan, or breach the security of the service, or interfere with its normal operation (including automated abuse of public endpoints, which are independently rate-limited).",
              "Resell or white-label the service without a separate written agreement.",
            ]}
          />
          <P>
            We may suspend or terminate accounts that violate this section, particularly attempts to de-anonymize
            respondents, which we treat as a material breach.
          </P>
        </Section>

        <Section title="7. Intellectual property">
          <P>
            SaferSay and its underlying technology remain our property. You retain ownership of your data. We grant you a
            limited, non-exclusive, non-transferable right to use the service during your subscription term.
          </P>
        </Section>

        <Section title="8. Confidentiality">
          <P>
            Each party will protect the other&apos;s confidential information with reasonable care and use it only to
            perform under these Terms.
          </P>
        </Section>

        <Section title="9. Warranties and disclaimers">
          <P>
            We will provide the service with reasonable skill and care. Except as expressly stated, the service is provided
            &quot;as is&quot;, and we disclaim all other warranties to the extent permitted by law, including implied
            warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </P>
        </Section>

        <Section title="10. Limitation of liability">
          <P>
            To the extent permitted by law, neither party&apos;s aggregate liability arising out of these Terms will exceed the
            fees paid by the Customer in the 12 months before the claim arose, except for liability that cannot be limited
            by law (e.g. death, personal injury, fraud, or breach of confidentiality/data protection obligations, where
            applicable). <em>[Liability cap and carve-outs to be confirmed with counsel.]</em>
          </P>
        </Section>

        <Section title="11. Indemnification">
          <P>
            You agree to indemnify us against claims arising from your misuse of the service or breach of these Terms,
            including claims arising from employee data you were not entitled to import.
          </P>
        </Section>

        <Section title="12. Term and termination">
          <P>
            These Terms remain in effect for as long as you use the service. Either party may terminate for the other&apos;s
            uncured material breach. On termination, data is deleted or returned per our{" "}
            <a href="/dpa" className="font-medium text-[var(--green)] underline">
              Data Processing Agreement
            </a>
            .
          </P>
        </Section>

        <Section title="13. Governing law and disputes">
          <P>
            <em>[Governing law and dispute resolution forum to be confirmed with counsel based on {LEGAL_ENTITY}&apos;s registered jurisdiction.]</em>
          </P>
        </Section>

        <Section title="14. Changes to these terms">
          <P>We may update these Terms from time to time. We&apos;ll notify you of material changes and update the date above.</P>
        </Section>

        <Section title="15. Contact">
          <P>
            Questions about these Terms can be sent to{" "}
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
