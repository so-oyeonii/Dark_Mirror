"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createGuestStore } from "@/lib/guest";

type Store = ReturnType<typeof createGuestStore>;
const GuestContext = createContext<Store | null>(null);

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createGuestStore(() => window.sessionStorage));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    if (!snapshot.record) return;
    const timer = window.setTimeout(store.expire, Math.max(0, snapshot.record.expiresAt - Date.now()));
    window.addEventListener("focus", store.expire);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", store.expire); };
  }, [store, snapshot.record]);
  return <GuestContext.Provider value={store}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const store = useContext(GuestContext);
  if (!store) throw new Error("GuestProvider is required");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, save: store.save, clear: store.clear };
}
