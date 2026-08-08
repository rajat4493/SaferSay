"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    <section className="card mb-[9px]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          <p className="meta-label">{label}</p>
          <h2 className="section-title mt-2">{title}</h2>
          <p className="mt-1.5 secondary-text">{body}</p>
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className={action.primary ? "btn-primary btn-pill" : "btn-secondary btn-pill"}>
                {action.label}
                <ArrowRight size={14} strokeWidth={1.8} />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
