import { z } from "zod";
import { DIMENSIONS, type Dimension } from "./assessment";

export const MATCH_TTL = 72 * 60 * 60 * 1000;
export const CONSENT_VERSION = "limited-fields-v1";
export const sharedFieldSchema = z.enum(["behavior", "mbti"]);
export type SharedField = z.infer<typeof sharedFieldSchema>;
const fieldsSchema = z.array(sharedFieldSchema).min(1).max(2).refine(fields => new Set(fields).size === fields.length);
const consentSchema = z.object({ userId: z.uuid(), version: z.literal(CONSENT_VERSION), fields: fieldsSchema, at: z.number().int() }).strict();
export const pairSchema = z.object({
  id: z.uuid(), inviterId: z.uuid(), inviteeId: z.uuid().nullable(), tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["pending", "accepted", "revoked"]), createdAt: z.number().int(), expiresAt: z.number().int(),
  consents: z.array(consentSchema).max(2),
}).strict().superRefine((pair, ctx) => {
  if (pair.expiresAt !== pair.createdAt + MATCH_TTL || pair.inviterId === pair.inviteeId ||
    (pair.status === "pending" && pair.inviteeId !== null) || (pair.status === "accepted" && !pair.inviteeId) ||
    new Set(pair.consents.map(item => item.userId)).size !== pair.consents.length ||
    pair.consents.some(item => ![pair.inviterId, pair.inviteeId].includes(item.userId) || item.at < pair.createdAt || item.at >= pair.expiresAt)) ctx.addIssue({ code: "custom", message: "Invalid pair state" });
});
export type Pair = z.infer<typeof pairSchema>;
export async function hashInvite(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function createInvitation(inviterId: string, now: number) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
  const pair = pairSchema.parse({ id: crypto.randomUUID(), inviterId, inviteeId: null, tokenHash: await hashInvite(token), status: "pending", createdAt: now, expiresAt: now + MATCH_TTL, consents: [] });
  return { pair, token };
}
function isOpen(pair: Pair, now: number) { return now >= pair.createdAt && now < pair.expiresAt && pair.status !== "revoked"; }
export function isMember(pair: Pair, userId: string) { return [pair.inviterId, pair.inviteeId].includes(userId); }
export async function acceptInvitation(input: Pair, token: string, userId: string, now: number): Promise<Pair | null> {
  const pair = pairSchema.parse(input);
  if (!isOpen(pair, now) || pair.status !== "pending" || userId === pair.inviterId || !z.uuid().safeParse(userId).success || !/^[a-f0-9]{64}$/.test(token)) return null;
  if (await hashInvite(token) !== pair.tokenHash) return null;
  return pairSchema.parse({ ...pair, inviteeId: userId, status: "accepted" });
}
export function consentToFields(input: Pair, userId: string, fields: unknown, now: number): Pair | null {
  const pair = pairSchema.parse(input);
  const parsed = fieldsSchema.safeParse(fields);
  if (!parsed.success || !isOpen(pair, now) || !isMember(pair, userId)) return null;
  return pairSchema.parse({ ...pair, consents: [...pair.consents.filter(item => item.userId !== userId), { userId, fields: parsed.data, at: now, version: CONSENT_VERSION }] });
}
export function revokePair(input: Pair, userId: string): Pair | null {
  const pair = pairSchema.parse(input);
  return isMember(pair, userId) ? { ...pair, status: "revoked", consents: [] } : null;
}
const scoreSchema = z.object({ boundary: z.number().min(0).max(100), approval: z.number().min(0).max(100), conflict: z.number().min(0).max(100), perspective: z.number().min(0).max(100), uncertainty: z.number().min(0).max(100) }).strict();
const profileSchema = z.object({ scores: scoreSchema, mbti: z.string().regex(/^[IE][NS][FT][JP]$/) }).strict();
export type MatchProfile = z.infer<typeof profileSchema>;
export function buildMatchReport(input: Pair, viewerId: string, profiles: Record<string, MatchProfile>, now: number) {
  const pair = pairSchema.parse(input);
  if (!isOpen(pair, now) || pair.status !== "accepted" || !pair.inviteeId || !isMember(pair, viewerId)) return null;
  const a = pair.consents.find(item => item.userId === pair.inviterId);
  const b = pair.consents.find(item => item.userId === pair.inviteeId);
  if (!a || !b) return null;
  const fields = a.fields.filter(field => b.fields.includes(field));
  if (!fields.length) return null;
  const first = profileSchema.parse(profiles[pair.inviterId]);
  const second = profileSchema.parse(profiles[pair.inviteeId]);
  return {
    version: "local-comparison-v1", fields,
    behavior: fields.includes("behavior") ? DIMENSIONS.map(({ id, label, reflection }) => ({ dimension: id as Dimension, label, a: first.scores[id], b: second.scores[id], reflection })) : [],
    mbti: fields.includes("mbti") ? { a: first.mbti, b: second.mbti, note: "MBTI는 재미로 대화를 여는 소재예요. 두 사람의 미래나 관계를 예측하지 않아요." } : null,
    suggestions: ["서로 편한 대화 속도를 직접 물어보세요.", "의견이 다를 때 쉬어갈 신호를 함께 정해보세요."],
    disclaimer: "가상의 두 사람으로 보는 예시이며, 실제 관계나 성격의 진단이 아닙니다.",
  };
}
export const SAMPLE_A = "a1111111-1111-4111-8111-111111111111";
export const SAMPLE_B = "b2222222-2222-4222-8222-222222222222";
export const SAMPLE_PROFILES: Record<string, MatchProfile> = {
  [SAMPLE_A]: { scores: { boundary: 65, approval: 40, conflict: 30, perspective: 75, uncertainty: 55 }, mbti: "INFP" },
  [SAMPLE_B]: { scores: { boundary: 45, approval: 60, conflict: 55, perspective: 65, uncertainty: 70 }, mbti: "ESTJ" },
};
