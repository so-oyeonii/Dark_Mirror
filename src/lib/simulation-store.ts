import { z } from "zod";
import type { StorageLike } from "./guest";
import { applySimulationTurn, createSimulationSession, endSimulation, scenarioIdSchema, simulationSessionSchema, type ScenarioId, type SimulationSession, type SimulationTurnResult } from "./simulation";

export const SIMULATION_KEY = "dark-mirror:simulations:v1";
export const SIMULATION_HISTORY_LIMIT = 20;
type Snapshot = { ready: boolean; sessions: SimulationSession[]; mode: "session" | "memory"; notice: string | null };
const INITIAL: Snapshot = { ready: false, sessions: [], mode: "session", notice: null };
const MEMORY_NOTICE = "브라우저에 대화를 임시 저장할 수 없어 현재 화면에서만 유지해요. 새로고침하면 사라질 수 있어요.";
const envelopeSchema = z.object({ version: z.literal(1), sessions: z.array(z.unknown()).max(SIMULATION_HISTORY_LIMIT + 1) });

export function restoreSimulations(raw: string | null, now: number) {
  if (!raw) return { sessions: [] as SimulationSession[], changed: false };
  try {
    const envelope = envelopeSchema.safeParse(JSON.parse(raw));
    if (!envelope.success) return { sessions: [], changed: true };
    const sessions: SimulationSession[] = [];
    for (const item of envelope.data.sessions) {
      const result = simulationSessionSchema.safeParse(item);
      if (result.success && result.data.updatedAt <= now && result.data.expiresAt > now) sessions.push(result.data);
    }
    if (new Set(sessions.map(item => item.id)).size !== sessions.length || sessions.filter(item => item.status === "active").length > 1 || sessions.filter(item => item.status !== "active").length > SIMULATION_HISTORY_LIMIT) return { sessions: [], changed: true };
    return { sessions, changed: sessions.length !== envelope.data.sessions.length };
  } catch { return { sessions: [], changed: true }; }
}

export function createSimulationStore(accessStorage: () => StorageLike | null, now = () => Date.now(), createId = () => crypto.randomUUID()) {
  let snapshot = INITIAL;
  let storage: StorageLike | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: Snapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const persist = (sessions: SimulationSession[], notice: string | null = null) => {
    const active = sessions.filter(item => item.status === "active");
    const history = sessions.filter(item => item.status !== "active").sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
    sessions = [...active, ...history.slice(0, SIMULATION_HISTORY_LIMIT)];
    if (history.length > SIMULATION_HISTORY_LIMIT) notice = "최근 20회까지만 보관하여 가장 오래된 대화 기록을 정리했어요.";
    let mode: Snapshot["mode"] = "session";
    try {
      if (!storage) throw new Error("unavailable");
      if (sessions.length) storage.setItem(SIMULATION_KEY, JSON.stringify({ version: 1, sessions }));
      else storage.removeItem(SIMULATION_KEY);
    } catch {
      mode = "memory";
      notice = [notice, MEMORY_NOTICE].filter(Boolean).join(" ");
      try { storage?.removeItem(SIMULATION_KEY); } catch { notice += " 기존 대화도 지우지 못해 새로고침하면 다시 보일 수 있어요. 이 탭을 닫고 사이트 데이터를 삭제해 주세요."; }
    }
    publish({ ready: true, sessions, mode, notice });
  };
  const initialize = () => {
    if (snapshot.ready) return;
    try {
      storage = accessStorage();
      if (!storage) throw new Error("unavailable");
      const restored = restoreSimulations(storage.getItem(SIMULATION_KEY), now());
      if (restored.changed) persist(restored.sessions, "만료되었거나 현재 버전과 맞지 않는 대화 기록을 정리했어요.");
      else publish({ ready: true, sessions: restored.sessions, mode: "session", notice: null });
    } catch { storage = null; publish({ ready: true, sessions: [], mode: "memory", notice: MEMORY_NOTICE }); }
  };
  const expire = () => {
    initialize();
    const sessions = snapshot.sessions.filter(item => item.expiresAt > now());
    if (sessions.length !== snapshot.sessions.length) persist(sessions, "시작한 지 24시간이 지난 대화 기록을 정리했어요.");
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); initialize(); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot, getServerSnapshot: () => INITIAL, expire,
    start(scenarioId: ScenarioId, consent: boolean) {
      expire();
      if (!consent || !scenarioIdSchema.safeParse(scenarioId).success || snapshot.sessions.some(item => item.status === "active")) return null;
      const session = createSimulationSession(scenarioId, now(), createId());
      persist([session, ...snapshot.sessions]);
      return session.id;
    },
    submit(id: string, input: unknown): SimulationTurnResult {
      expire();
      const session = snapshot.sessions.find(item => item.id === id);
      if (!session) return { ok: false, code: "missing", message: "대화 기록이 없거나 만료되었어요." };
      const result = applySimulationTurn(session, input, now());
      if (result.ok && !result.replayed) persist([result.session, ...snapshot.sessions.filter(item => item.id !== id)]);
      return result;
    },
    stop(id: string, safety = false) {
      expire();
      const session = snapshot.sessions.find(item => item.id === id);
      if (!session || session.status !== "active") return false;
      const ended = endSimulation(session, safety ? "safety" : "stopped", now());
      persist([ended, ...snapshot.sessions.filter(item => item.id !== id)]);
      return true;
    },
    remove(id: string) { expire(); persist(snapshot.sessions.filter(item => item.id !== id), "선택한 대화 기록을 삭제했어요."); },
    clear() { initialize(); persist([], "대화 기록을 모두 삭제했어요."); },
  };
}
