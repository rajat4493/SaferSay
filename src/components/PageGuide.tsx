"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

type GuideAction = {
  href: string;
  label: string;
  primary?: boolean;
};

export function PageGuide({
  label = "How to use this page",
  title,
  body,
  actions = [],
}: {
  label?: string;
  title: string;
  body: string;
  actions?: GuideAction[];
}) {
  return (
    <section className="mb-5 rounded-[1.75rem] border border-[var(--brand-border)] bg-white/85 p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
            <Info size={14} />
            {label}
          </div>
          <h2 className="mt-3 text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{body}</p>
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold ${
                  action.primary
                    ? "bg-[var(--brand-ink)] text-white"
                    : "border border-[var(--brand-border)] bg-white text-[var(--brand-ink)]"
                }`}
              >
                {action.label}
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
