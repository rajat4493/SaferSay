"use client";

import {
  BarChart3,
  ChevronDown,
  CreditCard,
  FileText,
  Home,
  Plug,
  LockKeyhole,
  Palette,
  Plus,
  Rocket,
  Settings,
  ShieldCheck,
  Users,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { RoleTag } from "@/components/RoleTag";
import { SignOutButton } from "@/components/SignOutButton";
import { useTenantSession } from "@/lib/useTenantSession";
import { canAccessPeople, canAccessWorkspace } from "@/lib/permissions";

const featuredNavItem = { href: "/app", label: "Get started", helper: "Your next step", icon: Home };

type NavItemConfig = {
  href: string;
  label: string;
  helper: string;
  icon: typeof Home;
  muted?: boolean;
  hideForPureOwner?: boolean;
};

type NavGroupConfig = {
  label: string;
  collapsible?: boolean;
  hideForPureOwner?: boolean;
  items: NavItemConfig[];
};

// Three-zone navigation per CLAUDE_CODE_ADMIN_REFACTOR.md §1
// All roles use the SAME app -- differences only in what's visible
const navGroups: NavGroupConfig[] = [
  {
    label: "Surveys",
    hideForPureOwner: true,
    items: [
      { href: "/app", label: "Browse surveys", helper: "Your active and past surveys", icon: Home },
      { href: "/app/surveys/new", label: "Create survey", helper: "Pick template, send invites", icon: Plus },
    ],
  },
  {
    label: "People",
    hideForPureOwner: true,
    items: [
      { href: "/app/people", label: "Employee list", helper: "Import CSV, add or deactivate", icon: Users },
    ],
  },
  {
    label: "Workspace",
    collapsible: true,
    hideForPureOwner: true,
    items: [
      { href: "/app/workspace/settings", label: "Settings", helper: "Confidentiality threshold", icon: Settings, hideForPureOwner: true },
      { href: "/app/workspace/go-live", label: "Go-live", helper: "Production readiness checks", icon: Rocket, hideForPureOwner: true },
      { href: "/app/workspace/security", label: "Security", helper: "Confidentiality proof", icon: LockKeyhole, hideForPureOwner: true },
      { href: "/app/workspace/billing", label: "Billing", helper: "Plan & payment", icon: CreditCard, hideForPureOwner: true },
    ],
  },
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const { info, loaded } = useTenantSession();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Pure Owner mode: signed in as the platform's super admin, not currently
  // acting inside any customer's workspace. No survey-running nav belongs
  // here -- that only appears once the Owner has explicitly entered a tenant.
  const pureOwnerMode = Boolean(info?.isSuperAdmin && !info.isImpersonating);

  // Apply role-based permission filters (four-role model per CLAUDE_CODE_ADMIN_REFACTOR.md §2)
  const visibleNavGroups = navGroups
    .filter((group) => {
      if (pureOwnerMode && group.hideForPureOwner) return false;
      // Filter "People" zone for roles without access
      if (group.label === "People" && info && !canAccessPeople(info.role)) return false;
      // Filter "Workspace" zone for non-admin roles
      if (group.label === "Workspace" && info && !canAccessWorkspace(info.role)) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !(pureOwnerMode && item.hideForPureOwner)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[var(--radius-shell)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold leading-none">{brand.name}</span>
                <RoleTag />
              </div>
              <div className="mt-1 text-xs text-[var(--brand-muted)]">{brand.tagline}</div>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            <NavLink item={featuredNavItem} active={pathname === featuredNavItem.href} featured />
          </nav>

          {visibleNavGroups.map((group) => {
            const hasActiveItem = group.items.some((item) => pathname === item.href);
            const isOpen = group.collapsible ? (openGroups[group.label] ?? hasActiveItem) : true;
            return (
              <div key={group.label} className="mt-6">
                {group.collapsible ? (
                  <button
                    onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !isOpen }))}
                    className="flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]"
                  >
                    {group.label}
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <p className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">{group.label}</p>
                )}
                {isOpen ? (
                  <nav className="mt-2 space-y-1">
                    {group.items.map((item) => (
                      <NavLink key={item.href} item={item} active={pathname === item.href} muted={item.muted} />
                    ))}
                  </nav>
                ) : null}
              </div>
            );
          })}
        </aside>

        <section className="rounded-[var(--radius-shell)] border border-white/80 bg-[var(--brand-glass-surface)] p-4 shadow-[var(--shadow-elevated)] backdrop-blur-2xl">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-5">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                <ShieldCheck size={14} />
                Confidential by design
              </div>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.025em]">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{subtitle}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link href="/app/pilot" className="inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white">
                First-run guide
              </Link>
              <SignOutButton />
            </div>
          </header>
          <div className="pt-5">
            <ImpersonationBanner />
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

type NavItem = { href: string; label: string; helper: string; icon: typeof Home };

function NavLink({ item, active, featured, muted }: { item: NavItem; active: boolean; featured?: boolean; muted?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
        active
          ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"
          : featured
            ? "bg-[var(--brand-ink)] text-white hover:opacity-90"
            : muted
              ? "text-[var(--brand-muted)] opacity-80 hover:opacity-100 hover:bg-white"
              : "text-[var(--brand-muted)] hover:bg-white"
      }`}
    >
      <item.icon size={muted ? 15 : 17} />
      <span className="min-w-0">
        <span className="block">{item.label}</span>
        <span className={`block truncate text-xs font-medium ${active || featured ? "opacity-75" : "text-[var(--brand-muted)]"}`}>{item.helper}</span>
      </span>
    </Link>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
