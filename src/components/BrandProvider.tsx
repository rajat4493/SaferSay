"use client";

import { createContext, useContext, useMemo, useState } from "react";
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
    return saved ? { ...defaultBrand, ...JSON.parse(saved) } : defaultBrand;
  });

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
