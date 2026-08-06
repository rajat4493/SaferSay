import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * The signature identity element (docs/strategy/SAFERSAY_DESIGN_SYSTEM.md
 * §2). Appears on Home and above every report. The specific "neither can
 * we" phrasing is the differentiator -- do not generalize it away.
 */
export function ConfidentialitySeal({ verifyHref = "/app/workspace/security" }: { verifyHref?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--brand-accent-soft)] bg-[var(--brand-accent-soft)] px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-input)] bg-white text-[var(--brand-accent-deep)] shadow-[var(--shadow-soft)]">
          <ShieldCheck size={18} />
        </span>
        <p className="text-sm leading-5 text-[var(--brand-accent-deep)]">
          <span className="font-semibold">Sealed by design</span> — you&apos;ll see the numbers, never the names — and
          neither can we. Answers can&apos;t be traced back to a person.
        </p>
      </div>
      <Link
        href={verifyHref}
        className="shrink-0 whitespace-nowrap text-sm font-semibold text-[var(--brand-accent-deep)] underline decoration-[var(--brand-accent)]/40 underline-offset-4 hover:decoration-[var(--brand-accent-deep)]"
      >
        How it works
      </Link>
    </div>
  );
}
