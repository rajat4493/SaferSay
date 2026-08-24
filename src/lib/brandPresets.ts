/**
 * Opt-in visual presets for tenant branding -- an extra layer on top of
 * BrandTheme's existing accentColor/fontFamily/logo controls, not a
 * replacement for them. Selecting a preset pre-fills accentColor/fontFamily
 * with sensible defaults (still independently editable afterward) and
 * supplies a small extra token set (radius/shadow/eNPS bar colors, an
 * optional sidebar gradient) that only applies when a preset is active --
 * with no preset selected (presetId: null), the app renders exactly as it
 * does today, per globals.css's "locked spec."
 *
 * "Calm Teal" is an independently-chosen palette in the same aesthetic
 * direction as a muted teal/mint/cream reference the team liked (soft
 * shadows, warm neutrals, calm low-saturation tones) -- not a copy of
 * that reference's exact colors, and never named after it anywhere
 * customer-facing or in code.
 */
export type BrandPresetTokens = {
  "--radius-card": string;
  "--radius-button": string;
  "--radius-pill": string;
  "--shadow-soft": string;
  "--shadow-elevated": string;
  "--enps-promoter": string;
  "--enps-passive": string;
  "--enps-detractor": string;
  /** Sidebar background + matching text/active-state colors -- always set
   * together, since a dark sidebarGradient needs light --sidebar-ink or
   * the nav becomes unreadable. Calm Teal's values here are identical to
   * globals.css's app-wide :root defaults (the sidebar default was
   * deliberately flipped to match this preset), so this group is
   * currently a no-op override for this preset specifically -- kept
   * explicit rather than omitted so a future preset with a different
   * sidebar treatment has a working example to follow. */
  sidebar?: {
    background: string;
    ink: string;
    inkMid: string;
    inkFaint: string;
    activeBg: string;
    activeInk: string;
    border: string;
  };
};

export type BrandPreset = {
  id: string;
  label: string;
  description: string;
  accentColor: string;
  fontFamily: string;
  tokens: BrandPresetTokens;
};

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: "calm-teal",
    label: "Calm Teal",
    description: "Softer shadows and radii, and a muted teal accent.",
    accentColor: "#0f6b63",
    fontFamily: "inter",
    tokens: {
      "--radius-card": "20px",
      "--radius-button": "12px",
      "--radius-pill": "999px",
      "--shadow-soft": "0 4px 16px rgba(15, 58, 53, 0.05)",
      "--shadow-elevated": "0 12px 32px rgba(15, 58, 53, 0.09)",
      "--enps-promoter": "#1f8f74",
      "--enps-passive": "#e7c766",
      "--enps-detractor": "#c2564a",
      sidebar: {
        background: "linear-gradient(175deg, #0c3f3c 0%, #135048 65%, #0c3f3c 100%)",
        ink: "#f3f8f6",
        inkMid: "#cfe4de",
        inkFaint: "#9fc2b9",
        activeBg: "rgba(255, 255, 255, 0.12)",
        activeInk: "#eafff6",
        border: "rgba(255, 255, 255, 0.14)",
      },
    },
  },
];

export function findBrandPreset(presetId: string | null | undefined): BrandPreset | null {
  if (!presetId) return null;
  return BRAND_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

/**
 * The CSS custom-property overrides a preset contributes to AppShell's/the
 * taker surface's inline style -- separate from accentColor/fontFamily
 * (which flow through deriveAccentPalette/brandFontOptions as they always
 * have) so accent/font stay independently overridable after a preset is
 * picked. Returns {} for no preset -- every value below only ever
 * *overrides* a CSS var that already has today's value as its :root
 * default, so an empty object changes nothing.
 */
export function presetStyleOverrides(presetId: string | null | undefined): Record<string, string> {
  const preset = findBrandPreset(presetId);
  if (!preset) return {};
  const { sidebar, ...rest } = preset.tokens;
  const overrides: Record<string, string> = { ...rest };
  if (sidebar) {
    overrides["--sidebar-bg"] = sidebar.background;
    overrides["--sidebar-ink"] = sidebar.ink;
    overrides["--sidebar-ink-mid"] = sidebar.inkMid;
    overrides["--sidebar-ink-faint"] = sidebar.inkFaint;
    overrides["--sidebar-active-bg"] = sidebar.activeBg;
    overrides["--sidebar-active-ink"] = sidebar.activeInk;
    overrides["--sidebar-border"] = sidebar.border;
  }
  return overrides;
}
