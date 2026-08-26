export function ConsoleCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <ConsoleCard>
      <p className="meta-label">{label}</p>
      <p className="data-number mt-2">{value}</p>
      {hint ? <p className="mt-1 secondary-text">{hint}</p> : null}
    </ConsoleCard>
  );
}

/**
 * Only green (ok) and red (attention/at_risk) are semantic colours in the
 * admin -- there's no third amber tier, so "attention" and "at_risk" share
 * the same red treatment and are told apart by label text only.
 */
export function HealthBadge({ status }: { status: "ok" | "attention" | "at_risk" }) {
  const labels = { ok: "OK", attention: "Attention", at_risk: "At risk" } as const;
  const isOk = status === "ok";
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold tracking-[0.04em] ${
        isOk ? "border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green)]" : "border-[var(--red-border)] bg-[var(--red-bg)] text-[var(--red)]"
      }`}
    >
      {labels[status]}
    </span>
  );
}

export function PlanBadge({ tier }: { tier: string }) {
  return <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--bg-active)] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold tracking-[0.04em] capitalize text-[var(--ink-mid)]">{tier}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <ConsoleCard className="border-dashed text-center">
      <p className="text-[14px] font-medium text-[var(--ink)]">{title}</p>
      <p className="mt-1 secondary-text">{description}</p>
    </ConsoleCard>
  );
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatRelative(value: string | null) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
