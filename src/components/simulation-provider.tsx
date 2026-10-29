"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createSimulationStore } from "@/lib/simulation-store";

type Store = ReturnType<typeof createSimulationStore>;
const Context = createContext<Store | null>(null);
export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createSimulationStore(() => window.sessionStorage));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    if (!snapshot.sessions.length) return;
    const expiry = Math.min(...snapshot.sessions.map(item => item.expiresAt));
    const timer = window.setTimeout(store.expire, Math.max(0, expiry - Date.now()));
    window.addEventListener("focus", store.expire);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", store.expire); };
  }, [store, snapshot.sessions]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useSimulation() {
  const store = useContext(Context);
  if (!store) throw new Error("SimulationProvider is required");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, active: snapshot.sessions.find(item => item.status === "active"), history: snapshot.sessions.filter(item => item.status !== "active"), start: store.start, submit: store.submit, stop: store.stop, remove: store.remove, clear: store.clear };
}
