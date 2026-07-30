export type BrandTheme = {
  name: string;
  tagline: string;
  logoDataUrl: string | null;
  font: "Geist" | "Inter" | "System";
  colors: {
    background: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    accentSoft: string;
    border: string;
  };
};

export const defaultBrand: BrandTheme = {
  name: "SaferSay",
  tagline: "Easy to start. Easy to leave. Easy to understand.",
  logoDataUrl: null,
  font: "Geist",
  colors: {
    background: "#f4f1ea",
    surface: "#fbfaf7",
    ink: "#161616",
    muted: "#625d56",
    accent: "#5543b7",
    accentSoft: "#ebe4ff",
    border: "#e4ddd2",
  },
};

export const presetThemes: Record<string, BrandTheme["colors"]> = {
  Violet: defaultBrand.colors,
  Slate: {
    background: "#f3f5f6",
    surface: "#ffffff",
    ink: "#101418",
    muted: "#5d6670",
    accent: "#2f5f86",
    accentSoft: "#e4eef6",
    border: "#dce3e8",
  },
  Coral: {
    background: "#f8f2ef",
    surface: "#fffaf7",
    ink: "#1d1715",
    muted: "#6b5d58",
    accent: "#b4513e",
    accentSoft: "#f5e2dc",
    border: "#e8d9d2",
  },
  Graphite: {
    background: "#f2f1ee",
    surface: "#fbfbfa",
    ink: "#151515",
    muted: "#66625d",
    accent: "#3f3f46",
    accentSoft: "#e8e7e3",
    border: "#dedbd4",
  },
};
