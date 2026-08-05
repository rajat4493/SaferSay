export function ConsoleCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--brand-border)] bg-white/80 p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <ConsoleCard>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--brand-muted)]">{hint}</p> : null}
    </ConsoleCard>
  );
}

export function HealthBadge({ status }: { status: "ok" | "attention" | "at_risk" }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-700",
    attention: "bg-amber-100 text-amber-700",
    at_risk: "bg-rose-100 text-rose-700",
  } as const;
  const labels = { ok: "OK", attention: "Attention", at_risk: "At risk" } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function PlanBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    standard: "bg-slate-100 text-slate-700",
    growth: "bg-indigo-100 text-indigo-700",
    enterprise: "bg-violet-100 text-violet-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[tier] ?? styles.standard}`}>
      {tier}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <ConsoleCard className="border-dashed text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[var(--brand-muted)]">{description}</p>
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
