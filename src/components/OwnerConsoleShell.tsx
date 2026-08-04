"use client";

import {
  Activity,
  Bell,
  CreditCard,
  LayoutGrid,
  Search,
  Settings,
  Sliders,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

const navItems = [
  { href: "/console", label: "Overview", icon: LayoutGrid },
  { href: "/console/tenants", label: "Tenants", icon: Users },
  { href: "/console/billing", label: "Billing", icon: CreditCard },
  { href: "/console/usage", label: "Usage & Health", icon: Activity },
  { href: "/console/plans", label: "Plans & Features", icon: Sliders },
  { href: "/console/support", label: "Support & Alerts", icon: Bell },
  { href: "/console/settings", label: "Settings", icon: Settings },
];

const environment = process.env.NODE_ENV === "production" ? "Production" : "Development";

export function OwnerConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-[var(--brand-border)] bg-white/70 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 border-b border-[var(--brand-border)] px-5">
            {/* Always the platform's own mark, never a tenant's Brand Studio logo -- this console is not white-labeled. */}
            <Image src="/safersay-mark.svg" alt="SaferSay" width={28} height={28} className="rounded-[0.5rem]" />
            <span className="text-sm font-semibold tracking-tight">SaferSay Console</span>
          </div>
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--brand-ink)] text-white"
                      : "text-[var(--brand-muted)] hover:bg-black/5"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="flex h-16 items-center justify-between gap-4 border-b border-[var(--brand-border)] bg-white/70 px-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                  environment === "Production"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {environment}
              </span>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]" />
              <input
                type="search"
                placeholder="Search tenants..."
                disabled
                className="h-9 w-full rounded-full border border-[var(--brand-border)] bg-white/80 pl-9 pr-3 text-sm text-[var(--brand-ink)] placeholder:text-[var(--brand-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                Owner
              </span>
              <SignOutButton />
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
