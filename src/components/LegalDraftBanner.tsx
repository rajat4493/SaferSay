// Every legal page on this site (/terms, /privacy, /dpa) renders this at
// the top. These are AI-drafted starting points modeled on real SaaS
// legal documents -- genuinely substantive, not filler -- but they are
// NOT a substitute for a qualified lawyer's review before real companies
// rely on them. Remove this banner only after that review has actually
// happened, not when it becomes inconvenient to show.
export function LegalDraftBanner() {
  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--red-border)] bg-[var(--red-bg)] p-4">
      <p className="text-[13.5px] font-semibold text-[var(--red)]">Draft — pending legal review</p>
      <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink-mid)]">
        This document is a substantive starting draft, not yet reviewed or approved by a qualified lawyer. Do not treat it as
        legally binding or rely on it with real customers until it has been reviewed for your specific jurisdiction, entity
        structure, and subprocessor list.
      </p>
    </div>
  );
}
