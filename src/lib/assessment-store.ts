import { z } from "zod";
import { answersSchema, answerValueSchema, completeAnswersSchema, QUESTIONS, QUESTION_VERSION, SCORING_VERSION } from "./assessment";
import type { StorageLike } from "./guest";

export const ASSESSMENT_KEY = "dark-mirror:assessments:v1";
export const ATTEMPT_TTL = 24 * 60 * 60 * 1000;
export const HISTORY_LIMIT = 20;
export const attemptSchema = z.object({
  id: z.uuid(),
  questionVersion: z.literal(QUESTION_VERSION),
  scoringVersion: z.literal(SCORING_VERSION),
  status: z.enum(["active", "completed"]),
  answers: answersSchema,
  currentIndex: z.number().int().min(0).max(QUESTIONS.length - 1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  completedAt: z.number().int().nonnegative().nullable(),
}).superRefine((attempt, ctx) => {
  const invalidTime = attempt.expiresAt !== attempt.createdAt + ATTEMPT_TTL || attempt.updatedAt < attempt.createdAt || attempt.updatedAt >= attempt.expiresAt;
  const invalidCompletion = attempt.status === "completed"
    ? attempt.completedAt === null || attempt.completedAt < attempt.createdAt || attempt.completedAt > attempt.updatedAt || !completeAnswersSchema.safeParse(attempt.answers).success
    : attempt.completedAt !== null;
  if (invalidTime || invalidCompletion) ctx.addIssue({ code: "custom", message: "Invalid attempt state" });
});
export type Attempt = z.infer<typeof attemptSchema>;
export type AssessmentSnapshot = { ready: boolean; attempts: Attempt[]; mode: "session" | "memory"; notice: string | null };
const INITIAL: AssessmentSnapshot = { ready: false, attempts: [], mode: "session", notice: null };
const MEMORY_NOTICE = "브라우저 임시 저장을 사용할 수 없어 검사 기록을 현재 화면에서만 유지해요. 새로고침하면 사라질 수 있어요.";
const envelopeSchema = z.object({ version: z.literal(1), attempts: z.array(z.unknown()).max(HISTORY_LIMIT + 1) });

export function restoreAttempts(raw: string | null, now: number): { attempts: Attempt[]; changed: boolean } {
  if (!raw) return { attempts: [], changed: false };
  try {
    const envelope = envelopeSchema.safeParse(JSON.parse(raw));
    if (!envelope.success) return { attempts: [], changed: true };
    const attempts: Attempt[] = [];
    for (const value of envelope.data.attempts) {
      const result = attemptSchema.safeParse(value);
      if (result.success && result.data.createdAt <= now && result.data.updatedAt <= now && result.data.expiresAt > now) attempts.push(result.data);
    }
    if (new Set(attempts.map(a => a.id)).size !== attempts.length || attempts.filter(a => a.status === "active").length > 1 || attempts.filter(a => a.status === "completed").length > HISTORY_LIMIT) return { attempts: [], changed: true };
    return { attempts, changed: attempts.length !== envelope.data.attempts.length };
  } catch { return { attempts: [], changed: true }; }
}

export function createAssessmentStore(accessStorage: () => StorageLike | null, now = () => Date.now(), createId = () => crypto.randomUUID()) {
  let snapshot = INITIAL;
  let storage: StorageLike | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: AssessmentSnapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const persist = (attempts: Attempt[], notice: string | null = null) => {
    let mode: AssessmentSnapshot["mode"] = "session";
    try {
      if (!storage) throw new Error("unavailable");
      if (attempts.length) storage.setItem(ASSESSMENT_KEY, JSON.stringify({ version: 1, attempts }));
      else storage.removeItem(ASSESSMENT_KEY);
    } catch {
      mode = "memory";
      notice = [notice, MEMORY_NOTICE].filter(Boolean).join(" ");
      try { storage?.removeItem(ASSESSMENT_KEY); }
      catch { notice += " 기존 검사 기록도 삭제하지 못해 새로고침하면 다시 보일 수 있어요. 이 탭을 닫고 사이트 데이터를 삭제해 주세요."; }
    }
    publish({ ready: true, attempts, mode, notice });
  };
  const initialize = () => {
    if (snapshot.ready) return;
    try {
      storage = accessStorage();
      if (!storage) throw new Error("unavailable");
      const restored = restoreAttempts(storage.getItem(ASSESSMENT_KEY), now());
      if (restored.changed) persist(restored.attempts, "만료되었거나 현재 문항 버전과 맞지 않는 검사 기록을 정리했어요.");
      else publish({ ready: true, attempts: restored.attempts, mode: "session", notice: null });
    } catch {
      storage = null;
      publish({ ready: true, attempts: [], mode: "memory", notice: MEMORY_NOTICE });
    }
  };
  const expire = () => {
    initialize();
    const valid = snapshot.attempts.filter(attempt => attempt.expiresAt > now());
    if (valid.length !== snapshot.attempts.length) persist(valid, "시작한 지 24시간이 지난 검사 기록을 정리했어요.");
  };
  const createAttempt = (): string => {
    const createdAt = now();
    const attempt = attemptSchema.parse({ id: createId(), questionVersion: QUESTION_VERSION, scoringVersion: SCORING_VERSION, status: "active", answers: {}, currentIndex: 0, createdAt, updatedAt: createdAt, expiresAt: createdAt + ATTEMPT_TTL, completedAt: null });
    persist([...snapshot.attempts.filter(item => item.status === "completed"), attempt]);
    return attempt.id;
  };
  const activeById = (id: string) => snapshot.attempts.find(item => item.id === id && item.status === "active");
  const replace = (attempt: Attempt) => persist(snapshot.attempts.map(item => item.id === attempt.id ? attempt : item));
  return {
    subscribe(listener: () => void) { listeners.add(listener); initialize(); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => INITIAL,
    expire,
    start() { expire(); return snapshot.attempts.find(item => item.status === "active")?.id ?? createAttempt(); },
    restart() { expire(); return createAttempt(); },
    answer(id: string, questionId: string, value: number) {
      expire();
      const active = activeById(id);
      if (!active || !QUESTIONS.some(item => item.id === questionId) || !answerValueSchema.safeParse(value).success) return false;
      replace({ ...active, answers: { ...active.answers, [questionId]: value }, updatedAt: now() });
      return true;
    },
    goTo(id: string, index: number) {
      expire();
      const active = activeById(id);
      if (!active || !Number.isInteger(index) || index < 0 || index >= QUESTIONS.length) return false;
      if (index > active.currentIndex && QUESTIONS.slice(0, index).some(item => active.answers[item.id] === undefined)) return false;
      replace({ ...active, currentIndex: index, updatedAt: now() });
      return true;
    },
    complete(id: string) {
      expire();
      const attempt = snapshot.attempts.find(item => item.id === id);
      if (!attempt) return null;
      if (attempt.status === "completed") return id;
      if (!completeAnswersSchema.safeParse(attempt.answers).success) return null;
      const completedAt = now();
      const completed: Attempt = { ...attempt, status: "completed", updatedAt: completedAt, completedAt };
      const history = [completed, ...snapshot.attempts.filter(item => item.status === "completed")].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
      persist(history.slice(0, HISTORY_LIMIT), history.length > HISTORY_LIMIT ? "최근 20회까지 보관하며 가장 오래된 검사 기록을 정리했어요." : null);
      return id;
    },
    remove(id: string) { expire(); persist(snapshot.attempts.filter(item => item.id !== id), "선택한 검사 기록을 삭제했어요."); },
    clear() { initialize(); persist([], "검사 기록을 모두 삭제했어요."); },
  };
}
