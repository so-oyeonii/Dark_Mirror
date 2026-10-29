import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSajuCardPayload, renderSajuCardBlob, sajuCardPayloadSchema } from "@/lib/saju-card";
import { ELEMENTS, elementSummary, MBTI_REFLECTIONS } from "@/lib/saju-interpretation";
import { MBTI_TYPES } from "@/lib/profile";

const elements = { wood: 2, fire: 1, earth: 1, metal: 1, water: 1 };
const safeInput = { elements, basis: "three-pillars" };
afterEach(() => vi.unstubAllGlobals());

describe("saju share allowlist", () => {
  it("includes only counts and their basis by default, with optional validated MBTI", () => {
    const payload = buildSajuCardPayload(safeInput);
    expect(payload).toEqual({ version: 1, type: "saju-reflection", ...safeInput });
    expect(payload).not.toHaveProperty("mbti");
    payload.elements.wood = 0;
    expect(elements.wood).toBe(2);
    expect(buildSajuCardPayload({ ...safeInput, mbti: "INFP" }).mbti).toBe("INFP");
  });
  it("rejects private fields at both boundaries instead of silently stripping them", () => {
    for (const key of ["nickname", "birthDate", "birthYear", "birthTime", "timezone", "pillars", "answers", "chat", "prompt", "interpretation", "id"]) {
      expect(() => buildSajuCardPayload({ ...safeInput, [key]: "private" })).toThrow();
      expect(sajuCardPayloadSchema.safeParse({ ...buildSajuCardPayload(safeInput), [key]: "private" }).success).toBe(false);
      expect(() => buildSajuCardPayload({ ...safeInput, elements: { ...elements, [key]: "private" } })).toThrow();
    }
  });
  it("rejects impossible counts, inconsistent totals, unknown MBTI and free-form content", () => {
    for (const value of [-1, 1.5, 9, NaN, Infinity, "2", undefined]) {
      expect(() => buildSajuCardPayload({ ...safeInput, elements: { ...elements, wood: value } })).toThrow();
    }
    for (const mbti of ["", "infp", "ABCD", "<script>private</script>"]) expect(() => buildSajuCardPayload({ ...safeInput, mbti })).toThrow();
    expect(() => buildSajuCardPayload({ ...safeInput, basis: "four-pillars" })).toThrow();
    expect(() => buildSajuCardPayload({ ...safeInput, elements: { ...elements, water: 0 } })).toThrow();
    expect(() => buildSajuCardPayload(null)).toThrow();
    expect(sajuCardPayloadSchema.safeParse({ ...buildSajuCardPayload(safeInput), type: "raw-profile" }).success).toBe(false);
    expect(sajuCardPayloadSchema.safeParse({ ...buildSajuCardPayload(safeInput), version: 2 }).success).toBe(false);
    expect(buildSajuCardPayload({ elements: { ...elements, water: 3 }, basis: "four-pillars" }).basis).toBe("four-pillars");
  });
  it("provides distinct authored questions for all 16 types and describes tied counts without ranking people", () => {
    expect(Object.keys(MBTI_REFLECTIONS).sort()).toEqual([...MBTI_TYPES].sort());
    expect(new Set(Object.values(MBTI_REFLECTIONS)).size).toBe(16);
    for (const question of Object.values(MBTI_REFLECTIONS)) expect(question.endsWith("?")).toBe(true);
    const summary = elementSummary({ wood: 2, fire: 2, earth: 1, metal: 1, water: 2 });
    expect(summary).toContain("목(木), 화(火), 수(水)");
    expect(summary).toContain("개수만으로 성격이나 관계를 판단할 수 없어요");
  });
});

function mockCanvas(blob: Blob | null = new Blob(["png-test"], { type: "image/png" })) {
  const lines: { text: string; x: number; y: number }[] = [];
  const context = {
    font: "", fillStyle: "",
    fillText: (text: string, x: number, y: number) => { lines.push({ text, x, y }); },
    fillRect: vi.fn(), measureText: (value: string) => ({ width: [...value].length * 28 }),
  };
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: vi.fn((callback: BlobCallback) => callback(blob)) };
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() }, createElement: vi.fn(() => canvas) });
  return { canvas, lines };
}

describe("saju PNG rendering boundaries", () => {
  it.each([["square", 1080], ["portrait", 1920]] as const)("renders %s with correct dimensions and approved text only", async (size, height) => {
    const { canvas, lines } = mockCanvas();
    const blob = await renderSajuCardBlob(buildSajuCardPayload(safeInput), size);
    expect(blob.type).toBe("image/png");
    expect(canvas.width).toBe(1080); expect(canvas.height).toBe(height);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    const text = lines.map(line => line.text).join(" ");
    for (const { label } of ELEMENTS) expect(text).toContain(label);
    expect(text).toContain("시주 제외");
    expect(text).toContain("AI 생성 아님");
    expect(text).toContain("진단·미래 예측 아님");
    expect(text).not.toContain("INFP");
    expect(lines.every(line => line.y > 0 && line.y < height)).toBe(true);
  });
  it.each(MBTI_TYPES)("fits the %s reflection above the square-card footer", async mbti => {
    const { lines } = mockCanvas();
    await renderSajuCardBlob(buildSajuCardPayload({ ...safeInput, mbti }), "square");
    const title = lines.findIndex(line => line.text === `${mbti} · 나에게 건네는 질문`);
    const footer = lines.findIndex(line => line.text.startsWith("사주·MBTI는"));
    expect(title).toBeGreaterThan(0);
    const reflection = lines.slice(title + 1, footer);
    expect(reflection.map(line => line.text).join("")).toBe(MBTI_REFLECTIONS[mbti]);
    expect(reflection.every(line => line.y < 1080 - 190)).toBe(true);
  });
  it("rejects unavailable canvas, invalid MIME/null blobs and server rendering", async () => {
    await expect(renderSajuCardBlob(buildSajuCardPayload(safeInput), "square")).rejects.toThrow("브라우저");
    for (const blob of [null, new Blob(["wrong"], { type: "image/jpeg" })]) {
      mockCanvas(blob);
      await expect(renderSajuCardBlob(buildSajuCardPayload(safeInput), "square")).rejects.toThrow("PNG");
    }
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
    await expect(renderSajuCardBlob(buildSajuCardPayload(safeInput), "square")).rejects.toThrow("브라우저");
  });
  it("validates payload before any canvas access", async () => {
    const { canvas } = mockCanvas();
    await expect(renderSajuCardBlob({ ...buildSajuCardPayload(safeInput), nickname: "private" }, "square")).rejects.toThrow();
    expect(canvas.getContext).not.toHaveBeenCalled();
  });
});
