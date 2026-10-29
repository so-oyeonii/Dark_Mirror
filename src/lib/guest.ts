import { z } from "zod";
import { profileSchema, type Profile } from "./profile";

export const GUEST_KEY = "dark-mirror:guest:v1";
export const GUEST_TTL = 24 * 60 * 60 * 1000;
const recordSchema = z.object({
  version: z.literal(1),
  profile: profileSchema,
  createdAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
}).refine(v => v.expiresAt === v.createdAt + GUEST_TTL);
export type GuestRecord = z.infer<typeof recordSchema>;
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type GuestSnapshot = {
  ready: boolean;
  record: GuestRecord | null;
  mode: "session" | "memory";
  notice: string | null;
};
const INITIAL: GuestSnapshot = { ready: false, record: null, mode: "session", notice: null };
const MEMORY_NOTICE = "브라우저 임시 저장을 사용할 수 없어 이 화면을 여는 동안만 유지해요. 새로고침하면 사라질 수 있어요.";

export function parseGuest(raw: string | null, now = Date.now()): GuestRecord | null {
  if (!raw) return null;
  try {
    const result = recordSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.createdAt > now || result.data.expiresAt <= now) return null;
    return result.data;
  } catch { return null; }
}

// Provider-scoped store: no shared user state on the server, no localStorage or network.
export function createGuestStore(accessStorage: () => StorageLike | null, now = () => Date.now()) {
  let snapshot = INITIAL;
  let storage: StorageLike | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: GuestSnapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const initialize = () => {
    if (snapshot.ready) return;
    try {
      storage = accessStorage();
      if (!storage) throw new Error("unavailable");
      const raw = storage.getItem(GUEST_KEY);
      const record = parseGuest(raw, now());
      if (raw && !record) storage.removeItem(GUEST_KEY);
      publish({ ready: true, record, mode: "session", notice: raw && !record ? "만료되었거나 읽을 수 없는 임시 프로필을 정리했어요." : null });
    } catch {
      storage = null;
      publish({ ready: true, record: null, mode: "memory", notice: MEMORY_NOTICE });
    }
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); initialize(); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => INITIAL,
    save(input: Profile) {
      initialize();
      const profile = profileSchema.parse(input);
      const createdAt = now();
      const record: GuestRecord = { version: 1, profile, createdAt, expiresAt: createdAt + GUEST_TTL };
      let mode = snapshot.mode;
      let notice: string | null = null;
      try {
        if (!storage) throw new Error("unavailable");
        storage.setItem(GUEST_KEY, JSON.stringify(record));
        mode = "session";
      }
      catch {
        // Avoid restoring an older profile if writing a replacement fails.
        mode = "memory"; notice = MEMORY_NOTICE;
        try { storage?.removeItem(GUEST_KEY); }
        catch { notice += " 기존 임시 정보도 삭제하지 못해 새로고침하면 이전 정보가 다시 보일 수 있어요. 이 탭을 닫고 사이트 데이터를 삭제해 주세요."; }
      }
      publish({ ready: true, record, mode, notice });
    },
    clear() {
      initialize();
      let notice: string | null = "임시 프로필을 초기화했어요.";
      let mode = snapshot.mode;
      try { storage?.removeItem(GUEST_KEY); }
      catch { mode = "memory"; notice = "화면의 정보는 지웠지만 브라우저 저장소를 지우지 못했어요. 이 탭을 닫고 사이트 데이터를 삭제해 주세요."; }
      publish({ ready: true, record: null, mode, notice });
    },
    expire() {
      if (snapshot.record && snapshot.record.expiresAt <= now()) {
        let notice = "24시간이 지나 임시 프로필을 정리했어요.";
        try { storage?.removeItem(GUEST_KEY); } catch { notice += " 브라우저 저장소 정리가 제한되어 있어 탭을 닫아 주세요."; }
        publish({ ...snapshot, record: null, notice });
      }
    },
  };
}
