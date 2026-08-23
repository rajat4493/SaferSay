"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialSurveyData, SurveyData } from "@/lib/localData";

type DataContextValue = {
  data: SurveyData;
  setData: (data: SurveyData) => void;
  resetData: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Always starts at initialSurveyData -- matches the server-rendered
  // markup, so hydration's first client pass has nothing to mismatch
  // against. The cached value (if any) is applied a moment later, in an
  // effect, not during render.
  const [data, setDataState] = useState<SurveyData>(initialSurveyData);

  useEffect(() => {
    const saved = window.localStorage.getItem("safersay-data");
    if (!saved) return;
    // Deferred a tick to avoid a synchronous setState in the effect body
    // (same pattern as BrandProvider's equivalent cache-hydration effect).
    queueMicrotask(() => setDataState(JSON.parse(saved)));
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      setData: (nextData) => {
        setDataState(nextData);
        window.localStorage.setItem("safersay-data", JSON.stringify(nextData));
      },
      resetData: () => {
        setDataState(initialSurveyData);
        window.localStorage.removeItem("safersay-data");
      },
    }),
    [data],
  );

  useEffect(() => {
    window.localStorage.setItem("safersay-data", JSON.stringify(data));
  }, [data]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useSurveyData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useSurveyData must be used inside DataProvider");
  return context;
}
