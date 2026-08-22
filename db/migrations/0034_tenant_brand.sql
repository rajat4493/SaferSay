-- Per-tenant brand (name/tagline/logo/accent color/font), previously
-- stored only in the browser's localStorage (BrandProvider.tsx) -- not
-- shared across devices or team members, and lost on a cleared browser.
-- One JSONB column rather than separate columns: brand fields are
-- read/written together as a single object by the client (see
-- BrandTheme in src/lib/brand.ts) and have no independent query need.
alter table identity.tenant_settings add column if not exists brand jsonb;
