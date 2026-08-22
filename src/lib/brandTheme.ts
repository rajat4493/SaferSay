/**
 * Derives the small palette the design system's CSS tokens need (--green,
 * --green-hover, --green-bg, --green-border) from one admin-picked accent
 * color, so white-labeling only ever asks for a single color input rather
 * than four separately-tuned swatches. Reversal of the "colors are locked"
 * decision documented in globals.css/brand.ts -- scoped deliberately: only
 * the app shell and respondent taker surface pick this up (see
 * AppShell.tsx, src/app/s/[token]/page.tsx), never the console/
 * super-admin surface, which stays on the fixed palette regardless of any
 * tenant's brand settings.
 */
export type AccentPalette = {
  "--green": string;
  "--green-hover": string;
  "--green-bg": string;
  "--green-border": string;
};

export function deriveAccentPalette(hex: string): AccentPalette {
  const { h, s, l } = hexToHsl(hex);
  return {
    "--green": hslToHex(h, s, l),
    "--green-hover": hslToHex(h, s, Math.max(l - 10, 0)),
    "--green-bg": hslToHex(h, Math.min(s, 35), Math.min(l + 42, 96)),
    "--green-border": hslToHex(h, Math.min(s, 45), Math.min(l + 25, 88)),
  };
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lFrac - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
