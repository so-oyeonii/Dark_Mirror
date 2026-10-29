import { describe, expect, it } from "vitest";
import { createSimulationStore, restoreSimulations, SIMULATION_KEY } from "@/lib/simulation-store";
import { SIMULATION_TTL } from "@/lib/simulation";
import type { StorageLike } from "@/lib/guest";

function setup() {
  let now = 1000;
  const values = new Map<string, string>();
  const storage: StorageLike = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
  const store = createSimulationStore(() => storage, () => now);
  return { store, storage, tick: (ms: number) => { now += ms; }, now: () => now };
}
describe("local simulation persistence", () => {
  it("requires consent and allows only one active scene", () => {
    const { store } = setup();
    expect(store.start("LOVE", false)).toBeNull();
    const id = store.start("LOVE", true);
    expect(id).toBeTruthy();
    expect(store.start("WORK", true)).toBeNull();
    expect(store.stop(id!)).toBe(true);
    expect(store.start("WORK", true)).toBeTruthy();
  });
  it("restores answers and replay identity after refresh", () => {
    const { store, storage, now } = setup();
    const id = store.start("FRIEND", true)!;
    const input = { requestId: crypto.randomUUID(), expectedTurn: 1, text: "생각할 시간이 필요해요." };
    expect(store.submit(id, input).ok).toBe(true);
    const restored = createSimulationStore(() => storage, now);
    restored.subscribe(() => {});
    expect(restored.getSnapshot().sessions[0].turns).toHaveLength(1);
    expect(restored.submit(id, input)).toMatchObject({ ok: true, replayed: true });
  });
  it("expires after 24h without extending at submission", () => {
    const { store, tick, storage } = setup();
    const id = store.start("LOVE", true)!;
    tick(SIMULATION_TTL - 1);
    store.submit(id, { requestId: crypto.randomUUID(), expectedTurn: 1, text: "천천히 해볼게요." });
    tick(1);
    expect(store.submit(id, { requestId: crypto.randomUUID(), expectedTurn: 2, text: "답변" })).toMatchObject({ ok: false, code: "missing" });
    expect(storage.getItem(SIMULATION_KEY)).toBeNull();
  });
  it("deletes raw dialogue without touching profile or assessment data", () => {
    const { store, storage } = setup();
    storage.setItem("dark-mirror:guest:v1", "profile");
    const id = store.start("LOVE", true)!;
    store.submit(id, { requestId: crypto.randomUUID(), expectedTurn: 1, text: "내 비공개 답변" });
    store.remove(id);
    expect(store.getSnapshot().sessions).toEqual([]);
    expect(storage.getItem(SIMULATION_KEY)).toBeNull();
    expect(storage.getItem("dark-mirror:guest:v1")).toBe("profile");
  });
  it("supports blocked-storage fallback and reports failed deletion", () => {
    const blocked = createSimulationStore(() => { throw new Error("blocked"); });
    const id = blocked.start("LOVE", true)!;
    expect(blocked.stop(id, true)).toBe(true);
    expect(blocked.getSnapshot().mode).toBe("memory");
    const { store, storage } = setup();
    store.start("LOVE", true);
    storage.removeItem = () => { throw new Error("blocked"); };
    store.clear();
    expect(store.getSnapshot().sessions).toEqual([]);
    expect(store.getSnapshot().notice).toContain("기존 대화도 지우지 못해");
  });
  it("keeps the latest 20 ended sessions with tied timestamps", () => {
    const { store } = setup();
    const ids: string[] = [];
    for (let i = 0; i < 21; i++) { const id = store.start("LOVE", true)!; ids.push(id); store.stop(id); }
    expect(store.getSnapshot().sessions).toHaveLength(20);
    expect(store.getSnapshot().sessions.some(item => item.id === ids[0])).toBe(false);
  });
  it("rejects corrupt versions, future records, duplicate IDs and forged turns", () => {
    const { store } = setup(); store.start("LOVE", true);
    const item = store.getSnapshot().sessions[0];
    for (const raw of ["bad-json", JSON.stringify({ version: 2, sessions: [item] }), JSON.stringify({ version: 1, sessions: [item, item] }), JSON.stringify({ version: 1, sessions: [{ ...item, promptVersion: "fake" }] })]) expect(restoreSimulations(raw, 1000).sessions).toEqual([]);
    expect(restoreSimulations(JSON.stringify({ version: 1, sessions: [item] }), 999).sessions).toEqual([]);
  });
});
