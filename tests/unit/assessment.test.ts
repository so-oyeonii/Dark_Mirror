import { describe, expect, it } from "vitest";
import source from "../../product/QUESTIONS.json";
import { DIMENSIONS, QUESTIONS, QUESTION_VERSION, scoreAnswers } from "@/lib/assessment";

const answers = (value: number) => Object.fromEntries(QUESTIONS.map(item => [item.id, value]));
describe("versioned questionnaire and deterministic scoring", () => {
  it("uses the source's 15 unique items and five groups of three without rewriting them", () => {
    expect(QUESTIONS).toEqual(source.items);
    expect(QUESTION_VERSION).toBe(source.version);
    expect(QUESTIONS).toHaveLength(15);
    expect(new Set(QUESTIONS.map(item => item.id)).size).toBe(15);
    for (const dimension of DIMENSIONS) expect(QUESTIONS.filter(item => item.dimension === dimension.id)).toHaveLength(3);
  });
  it.each([[1, 33.3], [3, 50], [5, 66.7]])("scores uniform raw %i as %s without treating all items as forward scored", (value, expected) => {
    expect(Object.values(scoreAnswers(answers(value)))).toEqual(Array(5).fill(expected));
  });
  it("maps reverse items 1→5 and 5→1 with exact lower/upper bounds", () => {
    const highest = Object.fromEntries(QUESTIONS.map(item => [item.id, item.reverse ? 1 : 5]));
    const lowest = Object.fromEntries(QUESTIONS.map(item => [item.id, item.reverse ? 5 : 1]));
    expect(Object.values(scoreAnswers(highest))).toEqual(Array(5).fill(100));
    expect(Object.values(scoreAnswers(lowest))).toEqual(Array(5).fill(0));
  });
  it("rounds to one decimal and does not mutate answers", () => {
    const input = Object.freeze({ ...answers(3), Q01: 2, Q02: 4, Q03: 3 });
    expect(scoreAnswers(input).boundary).toBe(33.3);
    expect(input.Q02).toBe(4);
    expect(scoreAnswers(input)).toEqual(scoreAnswers(input));
  });
  it("rejects missing and unknown question IDs", () => {
    const incomplete = answers(3);
    delete incomplete.Q15;
    expect(() => scoreAnswers(incomplete)).toThrow();
    expect(() => scoreAnswers({ ...answers(3), Q16: 3 })).toThrow();
  });
  it.each([0, 6, 1.5, NaN, Infinity, "3", null])("rejects invalid raw answer %s", value => {
    expect(() => scoreAnswers({ ...answers(3), Q01: value } as Record<string, number>)).toThrow();
  });
});
