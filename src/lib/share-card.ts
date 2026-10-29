import { z } from "zod";
import { DIMENSIONS } from "./assessment";

const scoreSchema = z.number().finite().min(0).max(100);
export const shareCardScoresSchema = z.object({ boundary: scoreSchema, approval: scoreSchema, conflict: scoreSchema, perspective: scoreSchema, uncertainty: scoreSchema }).strict();
export const shareCardPayloadSchema = z.object({ version: z.literal(1), type: z.literal("relationship-profile"), scores: shareCardScoresSchema }).strict();
export type ShareCardPayload = z.infer<typeof shareCardPayloadSchema>;
export const cardSizeSchema = z.enum(["square", "portrait"]);
export type CardSize = z.infer<typeof cardSizeSchema>;
export const CARD_SIZES = {
  square: { width: 1080, height: 1080, label: "정사각형 · 1080 × 1080" },
  portrait: { width: 1080, height: 1920, label: "세로형 · 1080 × 1920" },
} as const;

export function buildShareCardPayload(scores: unknown): ShareCardPayload {
  return shareCardPayloadSchema.parse({ version: 1, type: "relationship-profile", scores: shareCardScoresSchema.parse(scores) });
}

export async function renderShareCardBlob(input: unknown, size: CardSize): Promise<Blob> {
  const payload = shareCardPayloadSchema.parse(input);
  const dimensions = CARD_SIZES[cardSizeSchema.parse(size)];
  if (typeof document === "undefined") throw new Error("이미지 저장은 브라우저에서 사용할 수 있어요.");
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이 브라우저에서 이미지를 만들 수 없어요.");

  const portrait = size === "portrait";
  const width = dimensions.width;
  const height = dimensions.height;
  const font = '"Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif';
  const write = (text: string, x: number, y: number, pixels: number, color = "#f0f3f6", weight = 400) => {
    context.fillStyle = color;
    context.font = `${weight} ${pixels}px ${font}`;
    context.fillText(text, x, y);
  };

  context.fillStyle = "#142331";
  context.fillRect(0, 0, width, height);
  write("DARK MIRROR", 80, portrait ? 128 : 90, 30, "#d4e4ef", 700);
  write("관계 속 나를 돌아보기", 80, portrait ? 250 : 180, portrait ? 64 : 56, "#f0f3f6", 650);
  write("이번 답변에 나타난 다섯 가지 성향", 80, portrait ? 320 : 232, 28, "#b7c6d4");

  const startY = portrait ? 470 : 330;
  const rowHeight = portrait ? 220 : 116;
  DIMENSIONS.forEach((dimension, index) => {
    const y = startY + index * rowHeight;
    const score = payload.scores[dimension.id];
    write(dimension.label, 80, y, portrait ? 38 : 32, "#f0f3f6", 600);
    context.textAlign = "right";
    write(`${score.toFixed(1)} / 100`, 1000, y, portrait ? 38 : 32, "#d4e4ef", 600);
    context.textAlign = "left";
    context.fillStyle = "#30495c";
    context.fillRect(80, y + 22, 920, portrait ? 20 : 16);
    context.fillStyle = "#b4cedf";
    context.fillRect(80, y + 22, 920 * (score / 100), portrait ? 20 : 16);
    if (portrait) {
      write("0 · 이 경향이 덜 나타남", 80, y + 88, 23, "#b7c6d4");
      context.textAlign = "right";
      write("100 · 이 경향이 더 나타남", 1000, y + 88, 23, "#b7c6d4");
      context.textAlign = "left";
    }
  });

  context.strokeStyle = "#536879";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(80, height - 180); context.lineTo(1000, height - 180); context.stroke();
  write("검증된 심리검사나 진단 결과가 아닙니다.", 80, height - 130, 28, "#f0f3f6", 600);
  write("수치는 확률·백분위가 아니며, 높고 낮음에 우열이 없습니다.", 80, height - 87, 24, "#b7c6d4");
  write("출처: DARK MIRROR 15문항 · 로컬 데모", 80, height - 44, 23, "#b7c6d4");

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || blob.type !== "image/png") reject(new Error("PNG 이미지를 만들지 못했어요. 다시 시도해 주세요."));
      else resolve(blob);
    }, "image/png");
  });
}
