import { describe, expect, it } from "vitest";
import { createAssessmentStore, ASSESSMENT_KEY, ATTEMPT_TTL, HISTORY_LIMIT, restoreAttempts } from "@/lib/assessment-store";
import { QUESTIONS } from "@/lib/assessment";
import type { StorageLike } from "@/lib/guest";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}
function setup() {
  let time = 1000;
  const storage = memoryStorage();
  const store = createAssessmentStore(() => storage, () => time);
  return { storage, store, now: () => time, tick: (ms: number) => { time += ms; } };
}
function answerAll(store: ReturnType<typeof createAssessmentStore>, id: string, value = 3) {
  for (const question of QUESTIONS) store.answer(id, question.id, value);
}

describe("guest assessment lifecycle", () => {
  it("creates one active attempt and restores answers/current position", () => {
    const { storage, store, now } = setup();
    const id = store.start();
    expect(store.start()).toBe(id);
    expect(store.goTo(id, 1)).toBe(false);
    expect(store.answer(id, "Q01", 4)).toBe(true);
    expect(store.goTo(id, 1)).toBe(true);
    const restored = createAssessmentStore(() => storage, now);
    restored.subscribe(() => {});
    expect(restored.getSnapshot().attempts[0]).toMatchObject({ id, currentIndex: 1, answers: { Q01: 4 } });
  });
  it("rejects invalid answers, unknown IDs and invalid navigation", () => {
    const { store } = setup();
    const id = store.start();
    expect(store.answer(id, "unknown", 3)).toBe(false);
    expect(store.answer(id, "Q01", 6)).toBe(false);
    expect(store.answer("wrong-id", "Q01", 3)).toBe(false);
    expect(store.goTo(id, -1)).toBe(false);
    expect(store.goTo(id, 15)).toBe(false);
    expect(store.goTo(id, 1.5)).toBe(false);
    expect(store.goTo(id, 14)).toBe(false);
    expect(store.complete(id)).toBeNull();
  });
  it("requires all 15 answers and completes idempotently without later edits", () => {
    const { store } = setup();
    const id = store.start();
    for (const item of QUESTIONS.slice(0, 14)) store.answer(id, item.id, 3);
    expect(store.complete(id)).toBeNull();
    store.answer(id, "Q15", 3);
    expect(store.complete(id)).toBe(id);
    expect(store.complete(id)).toBe(id);
    expect(store.answer(id, "Q01", 5)).toBe(false);
    expect(store.goTo(id, 1)).toBe(false);
    expect(store.getSnapshot().attempts).toHaveLength(1);
  });
  it("keeps separate completed attempts and replaces only active work on restart", () => {
    const { store } = setup();
    const first = store.start();
    answerAll(store, first);
    store.complete(first);
    const second = store.start();
    store.answer(second, "Q01", 2);
    const restarted = store.restart();
    expect(new Set([first, second, restarted]).size).toBe(3);
    expect(store.getSnapshot().attempts.map(a => a.id)).toEqual([first, restarted]);
    expect(store.getSnapshot().attempts[1].answers).toEqual({});
  });
  it("expires from creation, not answer, navigation or completion time", () => {
    const { store, tick, storage } = setup();
    const id = store.start();
    tick(ATTEMPT_TTL - 1);
    answerAll(store, id);
    store.complete(id);
    expect(store.getSnapshot().attempts[0].expiresAt).toBe(1000 + ATTEMPT_TTL);
    tick(1);
    store.expire();
    expect(store.getSnapshot().attempts).toEqual([]);
    expect(storage.getItem(ASSESSMENT_KEY)).toBeNull();
    expect(store.complete(id)).toBeNull();
  });
  it("guards stale actions even if the browser's expiry timer was throttled", () => {
    const { store, tick } = setup();
    const id = store.start();
    tick(ATTEMPT_TTL);
    expect(store.answer(id, "Q01", 3)).toBe(false);
    expect(store.goTo(id, 1)).toBe(false);
    expect(store.complete(id)).toBeNull();
    expect(store.getSnapshot().attempts).toEqual([]);
  });
  it("retains the latest 20 completions even when timestamps tie", () => {
    const { store } = setup();
    const ids: string[] = [];
    for (let index = 0; index < HISTORY_LIMIT + 1; index++) {
      const id = store.start(); ids.push(id);
      answerAll(store, id); store.complete(id);
    }
    expect(store.getSnapshot().attempts).toHaveLength(HISTORY_LIMIT);
    expect(store.getSnapshot().attempts.some(a => a.id === ids[0])).toBe(false);
    expect(store.getSnapshot().attempts[0].id).toBe(ids.at(-1));
    store.start();
    expect(store.getSnapshot().attempts).toHaveLength(HISTORY_LIMIT + 1);
  });
  it("deletes one or all records while preserving unrelated profile storage", () => {
    const { store, storage } = setup();
    storage.setItem("dark-mirror:guest:v1", "profile");
    const first = store.start(); answerAll(store, first); store.complete(first);
    const second = store.start();
    store.remove(first);
    expect(store.getSnapshot().attempts.map(a => a.id)).toEqual([second]);
    store.clear();
    expect(storage.getItem(ASSESSMENT_KEY)).toBeNull();
    expect(storage.getItem("dark-mirror:guest:v1")).toBe("profile");
  });
  it("isolates memory fallback stores and permits completion without storage", () => {
    const store = createAssessmentStore(() => { throw new Error("blocked"); });
    const id = store.start(); answerAll(store, id);
    expect(store.complete(id)).toBe(id);
    expect(store.getSnapshot().mode).toBe("memory");
    const other = createAssessmentStore(() => null);
    other.subscribe(() => {});
    expect(other.getSnapshot().attempts).toEqual([]);
  });
  it("reports failed write+removal and recovers after storage becomes writable", () => {
    const { store, storage } = setup();
    const id = store.start();
    const set = storage.setItem; const remove = storage.removeItem;
    storage.setItem = () => { throw new Error("full"); };
    storage.removeItem = () => { throw new Error("blocked"); };
    store.answer(id, "Q01", 3);
    expect(store.getSnapshot().notice).toContain("기존 검사 기록도 삭제하지 못해");
    expect(store.getSnapshot().mode).toBe("memory");
    storage.setItem = set; storage.removeItem = remove;
    store.answer(id, "Q01", 4);
    expect(store.getSnapshot().mode).toBe("session");
    expect(store.getSnapshot().notice).toBeNull();
  });
  it("reports failed deletion without retaining a visible result", () => {
    const { store, storage } = setup();
    const id = store.start(); answerAll(store, id); store.complete(id);
    storage.removeItem = () => { throw new Error("blocked"); };
    store.clear();
    expect(store.getSnapshot().attempts).toEqual([]);
    expect(store.getSnapshot().notice).toContain("기존 검사 기록도 삭제하지 못해");
  });
});

describe("untrusted stored data validation", () => {
  it("discards invalid versions, completed partial answers and forged expiration", () => {
    const { store } = setup();
    const id = store.start(); answerAll(store, id); store.complete(id);
    const attempt = store.getSnapshot().attempts[0];
    for (const changed of [
      { ...attempt, questionVersion: "other" },
      { ...attempt, scoringVersion: "other" },
      { ...attempt, expiresAt: attempt.expiresAt + 1 },
      { ...attempt, answers: { Q01: 3 } },
      { ...attempt, answers: { ...attempt.answers, Q01: 10 } },
      { ...attempt, completedAt: attempt.updatedAt + 1 },
    ]) expect(restoreAttempts(JSON.stringify({ version: 1, attempts: [changed] }), 1000)).toEqual({ attempts: [], changed: true });
  });
  it("drops bad entries while restoring valid entries, and rejects duplicate IDs", () => {
    const { store } = setup();
    store.start();
    const attempt = store.getSnapshot().attempts[0];
    expect(restoreAttempts(JSON.stringify({ version: 1, attempts: [null, attempt] }), 1000)).toEqual({ attempts: [attempt], changed: true });
    expect(restoreAttempts(JSON.stringify({ version: 1, attempts: [attempt, attempt] }), 1000).attempts).toEqual([]);
    expect(restoreAttempts("broken JSON", 1000).changed).toBe(true);
    expect(restoreAttempts(JSON.stringify({ version: 2, attempts: [attempt] }), 1000).attempts).toEqual([]);
    expect(restoreAttempts(JSON.stringify({ version: 1, attempts: [attempt] }), 999).attempts).toEqual([]);
  });
});
