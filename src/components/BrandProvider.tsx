"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrandTheme, defaultBrand } from "@/lib/brand";

type BrandContextValue = {
  brand: BrandTheme;
  setBrand: (brand: BrandTheme) => void;
  resetBrand: () => void;
};

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrandState] = useState<BrandTheme>(() => {
    if (typeof window === "undefined") return defaultBrand;
    const saved = window.localStorage.getItem("safersay-brand");
    return saved ? JSON.parse(saved) : defaultBrand;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-bg", brand.colors.background);
    root.style.setProperty("--brand-surface", brand.colors.surface);
    root.style.setProperty("--brand-ink", brand.colors.ink);
    root.style.setProperty("--brand-muted", brand.colors.muted);
    root.style.setProperty("--brand-accent", brand.colors.accent);
    root.style.setProperty("--brand-accent-soft", brand.colors.accentSoft);
    root.style.setProperty("--brand-border", brand.colors.border);
    root.style.setProperty(
      "--brand-font",
      brand.font === "System"
        ? "ui-sans-serif, system-ui, sans-serif"
        : "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    );
  }, [brand]);

  const value = useMemo<BrandContextValue>(
    () => ({
      brand,
      setBrand: (nextBrand) => {
        setBrandState(nextBrand);
        window.localStorage.setItem("safersay-brand", JSON.stringify(nextBrand));
      },
      resetBrand: () => {
        setBrandState(defaultBrand);
        window.localStorage.removeItem("safersay-brand");
      },
    }),
    [brand],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) throw new Error("useBrand must be used inside BrandProvider");
  return context;
}
