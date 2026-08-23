/**
 * Workspace identity: name, tagline, logo, plus an optional accent color
 * and font family. Colors/fonts were previously locked to one fixed token
 * system (see globals.css) for design consistency; accentColor/fontFamily
 * reverse that for the tenant admin app + respondent survey specifically
 * (never the console/super-admin surface -- see AppShell.tsx and
 * src/app/s/[token]/page.tsx for where the override is actually applied).
 * Persisted server-side per tenant (identity.tenant_settings.brand, see
 * 0034_tenant_brand.sql) -- BrandProvider.tsx also caches the last-fetched
 * value in localStorage purely so the UI doesn't flash back to the
 * default while the server fetch is in flight, not as the source of truth.
 */
export type BrandTheme = {
  name: string;
  tagline: string;
  logoDataUrl: string | null;
  accentColor: string | null;
  fontFamily: string | null;
};

export const defaultBrand: BrandTheme = {
  name: "SaferSay",
  tagline: "Easy to start. Easy to leave. Easy to understand.",
  logoDataUrl: null,
  accentColor: null,
  fontFamily: null,
};

/** Curated, not free-text -- keeps every tenant's chosen font readable and license-safe (all already loaded as next/font in layout.tsx, or a system stack). */
export const brandFontOptions: Array<{ value: string; label: string; stack: string }> = [
  { value: "inter", label: "Inter (default)", stack: "var(--font-inter), -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" },
  { value: "system", label: "System UI", stack: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif" },
  { value: "georgia", label: "Georgia (serif)", stack: "Georgia, \"Times New Roman\", serif" },
];
