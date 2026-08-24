"use client";

import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Home,
  Library,
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
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { RoleTag } from "@/components/RoleTag";
import { SignOutButton } from "@/components/SignOutButton";
import { useTenantSession } from "@/lib/useTenantSession";
import { canAccessAuditLog, canAccessPeople, canAccessSecurityProof, canAccessWorkspace, canCreateSurvey, canViewSurveyResults } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";
import { brandFontOptions } from "@/lib/brand";
import { deriveAccentPalette } from "@/lib/brandTheme";
import { presetStyleOverrides } from "@/lib/brandPresets";

type NavItemConfig = {
  href: string;
  label: string;
  icon: typeof Home;
  hideForPureOwner?: boolean;
  visible?: (role: UserRole) => boolean;
};

// Primary nav: flat, three destinations. Everything else (workspace admin,
// trust/audit pages) lives in the user-card menu instead of taking up
// primary sidebar space -- same permission checks as before, just folded.
const primaryNavItems: NavItemConfig[] = [
  { href: "/app", label: "Home", icon: Home, hideForPureOwner: true },
  { href: "/app/overview", label: "Overview", icon: BarChart3, hideForPureOwner: true, visible: canViewSurveyResults },
  { href: "/app/surveys", label: "Surveys", icon: ClipboardList, hideForPureOwner: true },
  { href: "/app/people", label: "People", icon: Users, hideForPureOwner: true, visible: canAccessPeople },
];

const foldedMenuItems: NavItemConfig[] = [
  { href: "/app/questions", label: "Question bank", icon: Library, hideForPureOwner: true, visible: canCreateSurvey },
  { href: "/app/workspace/settings", label: "Settings", icon: Settings, hideForPureOwner: true, visible: canAccessWorkspace },
  { href: "/app/workspace/billing", label: "Billing", icon: CreditCard, hideForPureOwner: true, visible: canAccessWorkspace },
  { href: "/app/workspace/team", label: "Team", icon: UserPlus, hideForPureOwner: true, visible: canAccessWorkspace },
  { href: "/security", label: "Security", icon: LockKeyhole, hideForPureOwner: true, visible: canAccessSecurityProof },
  { href: "/app/audit-log", label: "Audit log", icon: ScrollText, hideForPureOwner: true, visible: canAccessAuditLog },
];

export function AppShell({
  children,
  title,
  subtitle,
  headerActions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  headerActions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const { info } = useTenantSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Escape closes the mobile drawer from anywhere, matching native dialog
  // behavior -- required since the drawer is role="dialog" aria-modal.
  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  // Pure Owner mode: signed in as the platform's super admin, not currently
  // acting inside any customer's workspace. No survey-running nav belongs
  // here -- that only appears once the Owner has explicitly entered a tenant.
  const pureOwnerMode = Boolean(info?.isSuperAdmin && !info.isImpersonating);

  const filterItems = (items: NavItemConfig[]) =>
    items.filter((item) => {
      if (pureOwnerMode && item.hideForPureOwner) return false;
      if (item.visible && info && !item.visible(info.role)) return false;
      return true;
    });

  const visiblePrimaryItems = filterItems(primaryNavItems);
  const visibleFoldedItems = filterItems(foldedMenuItems);

  // Console/super-admin pages don't render AppShell at all (separate
  // shell), so this override never reaches that surface -- deliberately,
  // per the white-label scoping decision.
  const themeOverrides: React.CSSProperties = {
    // Preset tokens (radius/shadow/eNPS bar/sidebar) apply first -- accent
    // color and font are layered on top so they stay independently
    // editable even after a preset is picked (see brandPresets.ts).
    ...(presetStyleOverrides(brand.presetId) as React.CSSProperties),
    ...(brand.accentColor ? (deriveAccentPalette(brand.accentColor) as React.CSSProperties) : {}),
    ...(brand.fontFamily ? ({ "--font-body": brandFontOptions.find((option) => option.value === brand.fontFamily)?.stack } as React.CSSProperties) : {}),
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="truncate text-[16px] font-semibold leading-none text-[var(--sidebar-ink)]">{brand.name}</span>
        </Link>
        <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-[var(--sidebar-ink-mid)] lg:hidden">
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2.5 py-2">
        <div className="space-y-0.5">
          {visiblePrimaryItems.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={() => setMobileNavOpen(false)} />
          ))}
        </div>
      </nav>

      <div className="relative mt-auto border-t border-[var(--sidebar-border)] px-2.5 py-2.5">
        {accountMenuOpen && visibleFoldedItems.length > 0 ? (
          <div className="absolute inset-x-2.5 bottom-[54px] rounded-[12px] border border-[var(--border)] bg-white p-1.5 shadow-[var(--shadow-elevated)]">
            {visibleFoldedItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setAccountMenuOpen(false);
                  setMobileNavOpen(false);
                }}
                className="flex items-center gap-2 rounded-[8px] px-2.5 py-[7px] text-[12.5px] text-[var(--ink-mid)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
              >
                <item.icon size={14} strokeWidth={1.8} />
                {item.label}
              </Link>
            ))}
            <div className="my-1 border-t border-[var(--border)]" />
            <div className="px-1">
              <SignOutButton />
            </div>
          </div>
        ) : null}

        <button
          onClick={() => setAccountMenuOpen((current) => !current)}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left transition hover:bg-[var(--sidebar-active-bg)]"
        >
          <Avatar label={info?.userName || info?.userEmail || brand.name} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-[var(--sidebar-ink)]">{info?.userName || info?.userEmail || brand.name}</div>
            <div className="truncate text-[11.5px] text-[var(--sidebar-ink-faint)]">{info?.tenantName ?? brand.name}</div>
            <RoleTag />
          </div>
          <ChevronDown size={14} strokeWidth={1.8} className={`shrink-0 text-[var(--sidebar-ink-faint)] transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]" style={themeOverrides}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--radius-button)] focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar -- always visible at lg+. background/borderColor set
          via inline style, not a Tailwind bg-[...] utility -- --sidebar-bg
          can be a gradient (see brandPresets.ts), and background-color
          (what bg-[...] sets) can't render one. */}
      <aside
        className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-r lg:flex"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar -- slide-in drawer, per "sidebar collapses" (design directive) */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNavOpen(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[240px] flex-col border-r"
            style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
          >
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 grid h-12 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[var(--border-soft)] bg-white/55 px-4 backdrop-blur-sm sm:px-6">
          <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="shrink-0 text-[var(--ink-mid)] lg:hidden">
            <Menu size={18} strokeWidth={1.8} />
          </button>
          <div className="hidden items-center justify-center gap-1.5 text-[13px] text-[#676A66] sm:flex">
            <Lock size={13} strokeWidth={1.8} />
            Confidential — you see numbers, never names
          </div>
          <Link href="/app/pilot" className="col-start-3 justify-self-end whitespace-nowrap text-[13px] font-medium text-[var(--ink-mid)] hover:text-[var(--ink)]">
            First-run guide
          </Link>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto px-5 py-10 lg:px-12 lg:py-16">
          <div className="mx-auto max-w-[1080px]">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="page-title">{title}</h1>
                <p className="mt-2 secondary-text">{subtitle}</p>
              </div>
              {headerActions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div> : null}
            </div>
            <ImpersonationBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItemConfig; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex h-12 items-center gap-3 rounded-[10px] px-4 text-[15px] font-medium transition ${
        active
          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-ink)]"
          : "text-[var(--sidebar-ink-mid)] hover:bg-[var(--sidebar-active-bg)] hover:text-[var(--sidebar-ink)]"
      }`}
    >
      <item.icon size={18} strokeWidth={1.7} />
      {item.label}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
