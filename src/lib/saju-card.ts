import { z } from "zod";
import { MBTI_TYPES } from "./profile";
import { CARD_SIZES, cardSizeSchema, type CardSize } from "./share-card";
import { ELEMENTS, MBTI_REFLECTIONS } from "./saju-interpretation";

const count = z.number().int().min(0).max(8);
export const sajuElementsSchema = z.object({ wood: count, fire: count, earth: count, metal: count, water: count }).strict();
const safeFields = {
  elements: sajuElementsSchema,
  basis: z.enum(["three-pillars", "four-pillars"]),
  mbti: z.enum(MBTI_TYPES).optional(),
};
const validTotal = (value: { elements: z.infer<typeof sajuElementsSchema>; basis: string }) =>
  Object.values(value.elements).reduce((sum, item) => sum + item, 0) === (value.basis === "three-pillars" ? 6 : 8);
const inputSchema = z.object(safeFields).strict().refine(validTotal, "표시한 명식과 오행 개수가 일치하지 않아요.");
export const sajuCardPayloadSchema = z.object({ version: z.literal(1), type: z.literal("saju-reflection"), ...safeFields }).strict().refine(validTotal);
export type SajuCardPayload = z.infer<typeof sajuCardPayloadSchema>;

// Only an explicit projection is accepted. Never pass Profile or a full engine result.
export function buildSajuCardPayload(input: unknown): SajuCardPayload {
  return sajuCardPayloadSchema.parse({ version: 1, type: "saju-reflection", ...inputSchema.parse(input) });
}

export async function renderSajuCardBlob(input: unknown, size: CardSize): Promise<Blob> {
  const payload = sajuCardPayloadSchema.parse(input);
  const { width, height } = CARD_SIZES[cardSizeSchema.parse(size)];
  if (typeof document === "undefined") throw new Error("이미지 저장은 브라우저에서 사용할 수 있어요.");
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서 이미지를 만들 수 없어요.");
  const portrait = size === "portrait";
  const font = '"Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif';
  const text = (value: string, x: number, y: number, pixels: number, color = "#f0f3f6", weight = 400) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${pixels}px ${font}`; ctx.fillText(value, x, y);
  };
  const wrap = (value: string, y: number, pixels: number, color = "#b7c6d4") => {
    ctx.font = `400 ${pixels}px ${font}`;
    let line = "";
    for (const character of value) {
      if (line && ctx.measureText(line + character).width > 920) {
        text(line, 80, y, pixels, color); y += pixels * 1.6; line = "";
      }
      line += character;
    }
    if (line) text(line, 80, y, pixels, color);
    return y + pixels * 1.6;
  };
  ctx.fillStyle = "#142331"; ctx.fillRect(0, 0, width, height);
  text("DARK MIRROR", 80, portrait ? 136 : 88, 30, "#d4e4ef", 700);
  text("나를 읽는 또 하나의 이야기", 80, portrait ? 255 : 180, 54, "#f0f3f6", 650);
  text("오행 글자 개수", 80, portrait ? 358 : 254, 30, "#d4e4ef");
  text(payload.basis === "three-pillars" ? "출생시간 미상 · 시주 제외 · 6글자 기준" : "년·월·일·시주 · 8글자 기준", 80, portrait ? 407 : 299, 26, "#b7c6d4");
  const start = portrait ? 530 : 385;
  ELEMENTS.forEach(({ id, label, color }, index) => {
    const x = 80 + index * 188;
    text(label, x, start, 32, color, 600);
    text(`${payload.elements[id]}개`, x, start + (portrait ? 124 : 90), 54, "#f0f3f6", 600);
    ctx.fillStyle = "#536879"; ctx.fillRect(x, start + (portrait ? 165 : 120), 140, 3);
  });
  let y = wrap("천간과 지지의 대표 오행만 집계해요. 강약이나 길흉, 운세 확률이 아닙니다.", portrait ? 830 : 580, 28);
  y += portrait ? 110 : 40;
  if (payload.mbti) {
    text(`${payload.mbti} · 나에게 건네는 질문`, 80, y, 34, "#d4e4ef", 600);
    wrap(MBTI_REFLECTIONS[payload.mbti], y + 55, 28);
  } else {
    text("오늘의 나를 한 가지 유형으로 정하지 않아요.", 80, y, 32, "#d4e4ef");
  }
  ctx.fillStyle = "#536879"; ctx.fillRect(80, height - 190, 920, 2);
  text("사주·MBTI는 재미와 성찰을 위한 이야기입니다.", 80, height - 140, 28, "#f0f3f6", 600);
  text("제한된 고정 문구 · AI 생성 아님 · 진단·미래 예측 아님", 80, height - 94, 25, "#b7c6d4");
  text("DARK MIRROR · 로컬 프로필 · 관계 테스트 점수와 별개", 80, height - 48, 24, "#b7c6d4");
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob?.type === "image/png") resolve(blob);
    else reject(new Error("PNG 이미지를 만들지 못했어요."));
  }, "image/png"));
}
