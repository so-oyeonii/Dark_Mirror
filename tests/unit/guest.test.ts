import { describe, expect, it } from "vitest";
import { createGuestStore, GUEST_KEY, GUEST_TTL, parseGuest, type StorageLike } from "@/lib/guest";
import { EMPTY_PROFILE } from "@/lib/profile";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}
describe("ephemeral guest storage", () => {
  it("saves a validated, versioned profile and restores it in the same tab", () => {
    const storage = memoryStorage();
    const store = createGuestStore(() => storage, () => 1000);
    store.save({ ...EMPTY_PROFILE, nickname: "수윤" });
    const restored = createGuestStore(() => storage, () => 2000);
    restored.subscribe(() => {});
    expect(restored.getSnapshot().record?.profile.nickname).toBe("수윤");
    expect(restored.getSnapshot().record?.expiresAt).toBe(1000 + GUEST_TTL);
  });
  it("does not restore expired, corrupted, future, or extended-TTL data", () => {
    const storage = memoryStorage();
    const store = createGuestStore(() => storage, () => 1000);
    store.save(EMPTY_PROFILE);
    const raw = storage.getItem(GUEST_KEY)!;
    expect(parseGuest(raw, 1000 + GUEST_TTL)).toBeNull();
    expect(parseGuest(raw, 999)).toBeNull();
    expect(parseGuest("not json", 1001)).toBeNull();
    expect(parseGuest(JSON.stringify({ ...JSON.parse(raw), version: 2 }), 1001)).toBeNull();
    expect(parseGuest(JSON.stringify({ ...JSON.parse(raw), expiresAt: 1000 + 2 * GUEST_TTL }), 1001)).toBeNull();
    const expired = createGuestStore(() => storage, () => 1000 + GUEST_TTL);
    expired.subscribe(() => {});
    expect(storage.getItem(GUEST_KEY)).toBeNull();
  });
  it("expires an open session and clears storage", () => {
    let now = 1000;
    const storage = memoryStorage();
    const store = createGuestStore(() => storage, () => now);
    store.save(EMPTY_PROFILE);
    now += GUEST_TTL;
    store.expire();
    expect(store.getSnapshot().record).toBeNull();
    expect(storage.getItem(GUEST_KEY)).toBeNull();
  });
  it("clears only this app's record", () => {
    const storage = memoryStorage();
    storage.setItem("unrelated", "keep");
    const store = createGuestStore(() => storage);
    store.save(EMPTY_PROFILE);
    store.clear();
    expect(storage.getItem(GUEST_KEY)).toBeNull();
    expect(storage.getItem("unrelated")).toBe("keep");
    expect(store.getSnapshot().record).toBeNull();
  });
  it("continues in memory when accessing storage throws", () => {
    const store = createGuestStore(() => { throw new Error("blocked"); });
    store.save({ ...EMPTY_PROFILE, nickname: "테스트" });
    expect(store.getSnapshot().mode).toBe("memory");
    expect(store.getSnapshot().record?.profile.nickname).toBe("테스트");
    expect(store.getSnapshot().notice).toContain("새로고침");
    store.clear();
    expect(store.getSnapshot().record).toBeNull();
  });
  it("removes the old stored profile if writing a replacement fails", () => {
    const storage = memoryStorage();
    const store = createGuestStore(() => storage);
    store.save({ ...EMPTY_PROFILE, nickname: "이전" });
    storage.setItem = () => { throw new Error("quota"); };
    store.save({ ...EMPTY_PROFILE, nickname: "새로운" });
    expect(store.getSnapshot().record?.profile.nickname).toBe("새로운");
    expect(store.getSnapshot().mode).toBe("memory");
    expect(storage.getItem(GUEST_KEY)).toBeNull();
  });
  it("does not claim persisted deletion when storage removal fails", () => {
    const storage = memoryStorage();
    const store = createGuestStore(() => storage);
    store.save(EMPTY_PROFILE);
    storage.removeItem = () => { throw new Error("blocked"); };
    store.clear();
    expect(store.getSnapshot().record).toBeNull();
    expect(store.getSnapshot().notice).toContain("지우지 못했어요");
  });
  it("warns when both replacement and removal fail, and recovers storage mode", () => {
    const storage = memoryStorage();
    const set = storage.setItem;
    const remove = storage.removeItem;
    const store = createGuestStore(() => storage);
    store.save({ ...EMPTY_PROFILE, nickname: "이전" });
    storage.setItem = () => { throw new Error("blocked"); };
    storage.removeItem = () => { throw new Error("blocked"); };
    store.save({ ...EMPTY_PROFILE, nickname: "변경" });
    expect(store.getSnapshot().notice).toContain("이전 정보가 다시 보일 수");
    storage.setItem = set;
    storage.removeItem = remove;
    store.save({ ...EMPTY_PROFILE, nickname: "복구" });
    expect(store.getSnapshot().mode).toBe("session");
    expect(store.getSnapshot().notice).toBeNull();
  });
  it("never stores invalid profiles", () => {
    const storage = memoryStorage();
    const store = createGuestStore(() => storage);
    expect(() => store.save({ ...EMPTY_PROFILE, nickname: "가" })).toThrow();
    expect(storage.getItem(GUEST_KEY)).toBeNull();
  });
});
