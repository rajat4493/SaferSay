"use client";

import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  Plug,
  LockKeyhole,
  Palette,
  ListChecks,
  Plus,
  Rocket,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";

const nav = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/pilot", label: "First run", icon: ListChecks },
  { href: "/app/templates", label: "Templates", icon: FileText },
  { href: "/app/surveys/new", label: "New survey", icon: Plus },
  { href: "/app/participants", label: "Participants", icon: Users },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/security", label: "Security", icon: LockKeyhole },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/integrations", label: "Integrations", icon: Plug },
  { href: "/app/readiness", label: "Go-live", icon: Rocket },
  { href: "/app/brand", label: "Brand Studio", icon: Palette },
  { href: "/viewer", label: "Viewer portal", icon: UserRoundCheck },
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  const { brand } = useBrand();

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[2rem] border border-[var(--brand-border)] bg-white/70 p-4 shadow-[0_24px_70px_rgba(22,22,22,0.08)]">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="font-semibold leading-none">{brand.name}</div>
              <div className="mt-1 text-xs text-[var(--brand-muted)]">{brand.tagline}</div>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"
                      : "text-[var(--brand-muted)] hover:bg-white"
                  }`}
                >
                  <item.icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-[0_35px_100px_rgba(22,22,22,0.12)] backdrop-blur-2xl">
          <header className="flex flex-col justify-between gap-4 border-b border-[var(--brand-border)] pb-5 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                <ShieldCheck size={14} />
                Confidential by design
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{subtitle}</p>
            </div>
            <Link href="/app/surveys/new" className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white">
              New survey
            </Link>
          </header>
          <div className="pt-5">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 shadow-sm ${className}`}>{children}</div>;
}
