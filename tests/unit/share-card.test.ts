import { describe, expect, it } from "vitest";
import { buildShareCardPayload, CARD_SIZES, renderShareCardBlob, shareCardPayloadSchema } from "@/lib/share-card";

const scores = { boundary: 50, approval: 25, conflict: 0, perspective: 100, uncertainty: 66.7 };
describe("safe local PNG card data", () => {
  it("accepts exactly five finite 0–100 scores without modifying input", () => {
    const payload = buildShareCardPayload(scores);
    expect(payload).toEqual({ version: 1, type: "relationship-profile", scores });
    expect(Object.keys(payload)).toEqual(["version", "type", "scores"]);
    payload.scores.boundary = 0;
    expect(scores.boundary).toBe(50);
  });
  it("rejects rather than strips identifiers, private input and unknown keys", () => {
    for (const key of ["nickname", "answers", "birthDate", "mbti", "chat", "id"]) {
      expect(() => buildShareCardPayload({ ...scores, [key]: "private" })).toThrow();
      expect(shareCardPayloadSchema.safeParse({ version: 1, type: "relationship-profile", scores, [key]: "private" }).success).toBe(false);
    }
  });
  it("rejects missing scores, invalid versions/types and out-of-range values", () => {
    for (const value of [undefined, null, "50", -1, 100.1, NaN, Infinity]) expect(() => buildShareCardPayload({ ...scores, boundary: value })).toThrow();
    expect(() => buildShareCardPayload(null)).toThrow();
    expect(() => buildShareCardPayload({ boundary: 50 })).toThrow();
    expect(shareCardPayloadSchema.safeParse({ version: 2, type: "relationship-profile", scores }).success).toBe(false);
    expect(shareCardPayloadSchema.safeParse({ version: 1, type: "chat", scores }).success).toBe(false);
  });
  it("supports the two required export sizes and refuses server-side rendering", async () => {
    expect(CARD_SIZES.square).toMatchObject({ width: 1080, height: 1080 });
    expect(CARD_SIZES.portrait).toMatchObject({ width: 1080, height: 1920 });
    await expect(renderShareCardBlob(buildShareCardPayload(scores), "square")).rejects.toThrow("브라우저");
  });
});
