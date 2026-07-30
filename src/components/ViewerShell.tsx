"use client";

import { BarChart3, Building2, FileText, Home, MessageSquareText, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";

const nav = [
  { href: "/viewer", label: "Overview", icon: Home },
  { href: "/viewer/org", label: "Organisation", icon: Building2 },
  { href: "/viewer/team", label: "My team", icon: Users },
  { href: "/viewer/comments", label: "Comments", icon: MessageSquareText },
  { href: "/viewer/actions", label: "Actions", icon: FileText },
];

export function ViewerShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  const { brand } = useBrand();

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between rounded-full border border-white/80 bg-white/75 px-4 py-3 shadow-[0_20px_70px_rgba(22,22,22,0.08)]">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="font-semibold leading-none">{brand.name}</div>
              <div className="mt-1 text-xs text-[var(--brand-muted)]">Viewer portal</div>
            </div>
          </Link>
          <Link href="/app" className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">Admin</Link>
        </nav>

        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-[2rem] border border-[var(--brand-border)] bg-white/70 p-3">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold ${active ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]" : "text-[var(--brand-muted)] hover:bg-white"}`}>
                  <item.icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </aside>

          <section className="rounded-[2rem] border border-white/80 bg-white/65 p-5 shadow-[0_35px_100px_rgba(22,22,22,0.12)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--brand-border)] pb-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                  <ShieldCheck size={14} />
                  Threshold-safe viewer access
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
                <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{subtitle}</p>
              </div>
              <BarChart3 className="hidden text-[var(--brand-accent)] sm:block" />
            </div>
            <div className="pt-5">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function ViewerCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 shadow-sm">{children}</div>;
}
