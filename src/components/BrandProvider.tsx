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
  // Source of truth is now the server (identity.tenant_settings.brand,
  // see /api/tenants/brand) so a tenant's brand is shared across every
  // team member's device, not stuck in whoever last set it locally.
  // localStorage is read here purely to paint the previously-fetched
  // value instantly on load instead of a default->real flash; it's a
  // cache, not the record of truth -- setBrand always PATCHes the server.
  // Always starts at defaultBrand -- matches what the server rendered, so
  // hydration's first client pass has nothing to mismatch against. The
  // cached value (if any) is applied a moment later, in an effect, same as
  // the server fetch just below.
  const [brand, setBrandState] = useState<BrandTheme>(defaultBrand);

  useEffect(() => {
    const saved = window.localStorage.getItem("safersay-brand");
    if (!saved) return;
    // Deferred a tick, same as the server-fetch effect below resolving via
    // a promise -- keeps this out of the synchronous effect body so it
    // doesn't trigger a same-tick cascading render.
    queueMicrotask(() => setBrandState((current) => ({ ...current, ...JSON.parse(saved) })));
  }, []);

  useEffect(() => {
    fetch("/api/tenants/brand")
      .then((response) => response.json())
      .then((data: { ok?: boolean; brand?: BrandTheme }) => {
        if (data.ok && data.brand) {
          setBrandState(data.brand);
          window.localStorage.setItem("safersay-brand", JSON.stringify(data.brand));
        }
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo<BrandContextValue>(
    () => ({
      brand,
      setBrand: (nextBrand) => {
        setBrandState(nextBrand);
        window.localStorage.setItem("safersay-brand", JSON.stringify(nextBrand));
        fetch("/api/tenants/brand", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(nextBrand),
        }).catch(() => undefined);
      },
      resetBrand: () => {
        setBrandState(defaultBrand);
        window.localStorage.removeItem("safersay-brand");
        fetch("/api/tenants/brand", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(defaultBrand),
        }).catch(() => undefined);
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
