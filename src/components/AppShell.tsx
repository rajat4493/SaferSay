"use client";

import {
  ChevronDown,
  CreditCard,
  Home,
  Lock,
  LockKeyhole,
  Menu,
  ScrollText,
  Settings,
  UserPlus,
  Users,
  X,
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
import { canAccessAuditLog, canAccessPeople, canAccessSecurityProof, canAccessWorkspace } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

type NavItemConfig = {
  href: string;
  label: string;
  icon: typeof Home;
  hideForPureOwner?: boolean;
  visible?: (role: UserRole) => boolean;
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
    items: [{ href: "/app", label: "All surveys", icon: Home }],
  },
  {
    label: "People",
    hideForPureOwner: true,
    items: [{ href: "/app/people", label: "Employee list", icon: Users }],
  },
  {
    label: "Workspace",
    collapsible: true,
    hideForPureOwner: true,
    items: [
      { href: "/app/workspace/settings", label: "Settings", icon: Settings, hideForPureOwner: true },
      { href: "/app/workspace/billing", label: "Billing", icon: CreditCard, hideForPureOwner: true },
      { href: "/app/workspace/team", label: "Team", icon: UserPlus, hideForPureOwner: true },
    ],
  },
  {
    // Not gated on Workspace access: auditor (Viewer) has security-proof and
    // audit-log access per permissions.ts but no Workspace access. Security
    // is a public page (/security), shown here as an in-app shortcut.
    label: "Trust",
    hideForPureOwner: true,
    items: [
      { href: "/security", label: "Security", icon: LockKeyhole, hideForPureOwner: true, visible: canAccessSecurityProof },
      { href: "/app/audit-log", label: "Audit log", icon: ScrollText, hideForPureOwner: true, visible: canAccessAuditLog },
    ],
  },
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const { info } = useTenantSession();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      items: group.items.filter((item) => {
        if (pureOwnerMode && item.hideForPureOwner) return false;
        if (item.visible && info && !item.visible(info.role)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="truncate text-[14px] font-semibold leading-none text-[var(--ink)]">{brand.name}</span>
        </Link>
        <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-[var(--ink-mid)] lg:hidden">
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        {visibleNavGroups.map((group, index) => {
          const hasActiveItem = group.items.some((item) => pathname === item.href);
          const isOpen = group.collapsible ? (openGroups[group.label] ?? hasActiveItem) : true;
          return (
            <div key={group.label} className={index === 0 ? "" : "mt-5"}>
              {group.collapsible ? (
                <button
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !isOpen }))}
                  className="meta-label flex w-full items-center justify-between px-2.5 py-1"
                >
                  {group.label}
                  <ChevronDown size={12} strokeWidth={2} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
              ) : (
                <p className="meta-label px-2.5 py-1">{group.label}</p>
              )}
              {isOpen ? (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={() => setMobileNavOpen(false)} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--bg-active)] px-4 py-3">
        <div className="truncate text-[13px] font-medium text-[var(--ink)]">{info?.tenantName ?? brand.name}</div>
        <div className="mt-0.5">
          <RoleTag />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      {/* Desktop sidebar -- always visible at lg+ */}
      <aside className="sticky top-0 hidden h-screen w-[200px] shrink-0 flex-col border-r border-[var(--border)] bg-white lg:flex">{sidebarContent}</aside>

      {/* Mobile sidebar -- slide-in drawer, per "sidebar collapses" (design directive) */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[240px] flex-col border-r border-[var(--border)] bg-white">{sidebarContent}</aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 py-[11px] sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="shrink-0 text-[var(--ink-mid)] lg:hidden">
              <Menu size={18} strokeWidth={1.8} />
            </button>
            <div className="hidden items-center gap-1.5 text-[12px] font-medium text-[var(--ink-mid)] sm:flex">
              <Lock size={13} strokeWidth={1.8} />
              Confidential — you see numbers, never names
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link href="/app/pilot" className="hidden secondary-text font-medium text-[var(--ink-mid)] hover:text-[var(--ink)] sm:inline">
              First-run guide
            </Link>
            <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[10px] font-semibold text-white">
              {(info?.tenantName ?? brand.name).slice(0, 1).toUpperCase()}
            </div>
            <SignOutButton />
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-4 py-7 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <h1 className="page-title">{title}</h1>
              <p className="mt-1.5 secondary-text">{subtitle}</p>
            </div>
            <ImpersonationBanner />
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItemConfig; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-[var(--radius-input)] px-2.5 py-[7px] text-[13px] transition ${
        active ? "bg-[var(--bg-active)] font-medium text-[var(--ink)]" : "font-normal text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
      }`}
    >
      <item.icon size={15} strokeWidth={1.8} />
      {item.label}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
