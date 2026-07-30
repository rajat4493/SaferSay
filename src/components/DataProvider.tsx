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
  const [data, setDataState] = useState<SurveyData>(() => {
    if (typeof window === "undefined") return initialSurveyData;
    const saved = window.localStorage.getItem("safersay-data");
    return saved ? JSON.parse(saved) : initialSurveyData;
  });

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
