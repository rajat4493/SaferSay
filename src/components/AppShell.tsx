"use client";

import {
  ArrowRight,
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
import { SignOutButton } from "@/components/SignOutButton";

const nav = [
  { href: "/app", label: "Home", helper: "Where to start", icon: Home },
  { href: "/app/pilot", label: "First run", helper: "Your checklist", icon: ListChecks, featured: true },
  { href: "/app/participants", label: "People", helper: "Upload employees", icon: Users },
  { href: "/app/templates", label: "Templates", helper: "Question sets", icon: FileText },
  { href: "/app/surveys/new", label: "Create survey", helper: "Issue tokens", icon: Plus },
  { href: "/app/integrations", label: "Invites", helper: "Prepare sending", icon: Plug },
  { href: "/app/reports", label: "Reports", helper: "Safe insights", icon: BarChart3 },
  { href: "/app/readiness", label: "Go-live", helper: "Production checks", icon: Rocket },
  { href: "/app/security", label: "Security", helper: "Confidentiality proof", icon: LockKeyhole },
  { href: "/app/billing", label: "Billing", helper: "Payment setup", icon: CreditCard },
  { href: "/app/brand", label: "Brand Studio", helper: "Client styling", icon: Palette },
  { href: "/viewer", label: "Viewer portal", helper: "Manager view", icon: UserRoundCheck },
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
                      : item.featured
                        ? "bg-[var(--brand-ink)] text-white hover:opacity-90"
                        : "text-[var(--brand-muted)] hover:bg-white"
                  }`}
                >
                  <item.icon size={17} />
                  <span className="min-w-0">
                    <span className="block">{item.label}</span>
                    <span className={`block truncate text-xs font-medium ${active || item.featured ? "opacity-75" : "text-[var(--brand-muted)]"}`}>
                      {item.helper}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[1.5rem] border border-[var(--brand-border)] bg-white p-4">
            <p className="text-sm font-semibold">Lost?</p>
            <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">Use the first-run guide. It tells you the next click based on what is already done.</p>
            <Link href="/app/pilot" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-accent)]">
              Open guide
              <ArrowRight size={14} />
            </Link>
          </div>
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
            <div className="flex items-center gap-3">
              <Link href="/app/pilot" className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white">
                First-run guide
              </Link>
              <SignOutButton />
            </div>
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
