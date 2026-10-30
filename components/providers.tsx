"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { applyPrefs, loadPrefs, loadSession, savePrefs, type Prefs, type Session } from "@/lib/identity";
import { t, type CopyKey } from "@/lib/i18n";

type AppValue = {
  prefs: Prefs;
  setPrefs: (prefs: Prefs) => void;
  session: Session | null;
  setSession: (session: Session | null) => void;
  booted: boolean;
};

const AppContext = createContext<AppValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>({ theme: "light", font: "m", lang: "en" });
  const [session, setSession] = useState<Session | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const stored = loadPrefs();
    applyPrefs(stored);
    const id = window.setTimeout(() => {
      setPrefsState(stored);
      setSession(loadSession());
      setBooted(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const setPrefs = (next: Prefs) => {
    setPrefsState(next);
    savePrefs(next);
    applyPrefs(next);
  };

  return (
    <AppContext.Provider value={{ prefs, setPrefs, session, setSession, booted }}>
      {children}
      <Toaster position="bottom-center" offset={96} />
    </AppContext.Provider>
  );
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside Providers");
  return value;
}

export function useT() {
  const { prefs } = useApp();
  return (key: CopyKey, vars?: Record<string, string | number>) => t(prefs.lang, key, vars);
}
