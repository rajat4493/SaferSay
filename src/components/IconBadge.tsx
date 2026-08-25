import type { getScoreTier } from "@/lib/scoreTier";

/** Small colored circular badge -- a recurring icon-in-a-circle motif used
 * for strengths/priorities rows and (formerly) heatmap tiles. Deliberately
 * generic (never a per-theme-name icon): construct names are open-ended and
 * tenant-defined via the question bank, so there's no safe fixed
 * name -> icon mapping. Shared between the Overview and per-survey Results
 * pages so the visual language stays identical wherever a tier is shown. */
export function IconBadge({
  icon: Icon,
  tier,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  tier: ReturnType<typeof getScoreTier>;
}) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: tier.bg }}>
      <Icon size={14} strokeWidth={2} style={{ color: tier.text }} />
    </span>
  );
}
