"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createAssessmentStore } from "@/lib/assessment-store";

type Store = ReturnType<typeof createAssessmentStore>;
const AssessmentContext = createContext<Store | null>(null);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createAssessmentStore(() => window.sessionStorage));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    if (!snapshot.attempts.length) return;
    const expiresAt = Math.min(...snapshot.attempts.map(attempt => attempt.expiresAt));
    const timer = window.setTimeout(store.expire, Math.max(0, expiresAt - Date.now()));
    window.addEventListener("focus", store.expire);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", store.expire); };
  }, [store, snapshot.attempts]);
  return <AssessmentContext.Provider value={store}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const store = useContext(AssessmentContext);
  if (!store) throw new Error("AssessmentProvider is required");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {
    ...snapshot,
    active: snapshot.attempts.find(attempt => attempt.status === "active"),
    history: snapshot.attempts.filter(attempt => attempt.status === "completed").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    start: store.start, restart: store.restart, answer: store.answer, goTo: store.goTo, complete: store.complete, remove: store.remove, clear: store.clear,
  };
}
