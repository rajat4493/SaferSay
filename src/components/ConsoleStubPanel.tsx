export function ConsoleStubPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--brand-border)] bg-white/60 p-10">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--brand-muted)]">{description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
        Coming next, built one step at a time per the Owner Control Room build order
      </p>
    </div>
  );
}
