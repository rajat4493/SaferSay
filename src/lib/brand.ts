/**
 * Workspace identity only -- name, tagline, logo. Color and font are no
 * longer tenant-customizable: the admin surface uses one fixed token
 * system (see globals.css) so the crisp, white, tool-register look is
 * consistent everywhere. Per-tenant chrome recoloring was removed because
 * it directly conflicted with that locked palette.
 */
export type BrandTheme = {
  name: string;
  tagline: string;
  logoDataUrl: string | null;
};

export const defaultBrand: BrandTheme = {
  name: "SaferSay",
  tagline: "Easy to start. Easy to leave. Easy to understand.",
  logoDataUrl: null,
};
