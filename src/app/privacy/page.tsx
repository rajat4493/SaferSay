export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-bg)] p-6 text-[var(--brand-ink)]">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--brand-border)] bg-white/75 p-6">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Privacy Notice Placeholder</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--brand-muted)]">
          SaferSay is operated by MindscopeAI LLP. This placeholder will be replaced
          before production with a reviewed GDPR privacy notice covering identity data,
          response data, retention, subprocessors, data subject rights, and contact details.
        </p>
        <h2 className="mt-6 text-xl font-semibold">Core promise</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
          Sign-in and participation are used to confirm eligibility and prevent duplicate
          responses. Answers are stored separately and reported only in protected groups.
        </p>
      </article>
    </main>
  );
}
