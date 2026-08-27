import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * The single distinctive element in the admin (SAFERSAY_DESIGN_SYSTEM
 * directive). Appears on the Surveys home page and above every report,
 * nowhere else. Exact copy is approved product voice -- don't reword it.
 */
export function ConfidentialitySeal({ verifyHref = "/app/security-proof" }: { verifyHref?: string }) {
  return (
    <div className="seal-strip mb-[9px]">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-input)] bg-white text-[var(--ink)]">
          <ShieldCheck size={16} strokeWidth={1.8} />
        </span>
        <p className="secondary-text text-[var(--ink-mid)]">
          <span className="font-semibold text-[var(--ink)]">Sealed by design</span> — You see the numbers, never the
          names. Neither can we.
        </p>
      </div>
      <Link href={verifyHref} className="shrink-0 whitespace-nowrap text-[13px] font-medium text-[var(--ink)] underline decoration-[var(--border-hover)] underline-offset-4 hover:decoration-[var(--ink)]">
        How it works →
      </Link>
    </div>
  );
}
