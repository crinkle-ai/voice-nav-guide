import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AutoVerifyProgress = {
  docs: Set<string>;
  meds: Set<string>;
};

export type AutoVerifyProgressAPI = {
  startDoc: (fp: string) => void;
  finishDoc: (fp: string) => void;
  startMed: (fp: string) => void;
  finishMed: (fp: string) => void;
  isDocVerifying: (fp: string) => boolean;
  isMedVerifying: (fp: string) => boolean;
};

const AutoVerifyContext = createContext<AutoVerifyProgressAPI | null>(null);

export function AutoVerifyProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<Set<string>>(new Set());
  const [meds, setMeds] = useState<Set<string>>(new Set());

  const startDoc = useCallback((fp: string) => {
    setDocs((prev) => new Set(prev).add(fp));
  }, []);

  const finishDoc = useCallback((fp: string) => {
    setDocs((prev) => {
      const next = new Set(prev);
      next.delete(fp);
      return next;
    });
  }, []);

  const startMed = useCallback((fp: string) => {
    setMeds((prev) => new Set(prev).add(fp));
  }, []);

  const finishMed = useCallback((fp: string) => {
    setMeds((prev) => {
      const next = new Set(prev);
      next.delete(fp);
      return next;
    });
  }, []);

  const isDocVerifying = useCallback((fp: string) => docs.has(fp), [docs]);
  const isMedVerifying = useCallback((fp: string) => meds.has(fp), [meds]);

  return (
    <AutoVerifyContext.Provider
      value={{ startDoc, finishDoc, startMed, finishMed, isDocVerifying, isMedVerifying }}
    >
      {children}
    </AutoVerifyContext.Provider>
  );
}

export function useAutoVerifyProgress(): AutoVerifyProgressAPI {
  const ctx = useContext(AutoVerifyContext);
  if (!ctx) {
    throw new Error("useAutoVerifyProgress must be used within AutoVerifyProvider");
  }
  return ctx;
}
