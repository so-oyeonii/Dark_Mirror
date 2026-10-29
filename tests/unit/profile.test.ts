import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, MBTI_TYPES, profileSchema } from "@/lib/profile";

describe("optional profile validation", () => {
  it("allows a completely anonymous profile", () => {
    expect(profileSchema.parse(EMPTY_PROFILE)).toEqual(EMPTY_PROFILE);
  });
  it("trims nicknames and validates 2–20 characters only when supplied", () => {
    expect(profileSchema.parse({ ...EMPTY_PROFILE, nickname: "  수윤  " }).nickname).toBe("수윤");
    for (const nickname of ["수", "가".repeat(21)]) expect(profileSchema.safeParse({ ...EMPTY_PROFILE, nickname }).success).toBe(false);
  });
  it("accepts exactly the 16 MBTI types or no type", () => {
    expect(MBTI_TYPES).toHaveLength(16);
    for (const mbti of MBTI_TYPES) expect(profileSchema.safeParse({ ...EMPTY_PROFILE, mbti }).success).toBe(true);
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, mbti: "ABCD" }).success).toBe(false);
  });
  it.each([
    ["2000", "2", "29", true], ["2001", "2", "29", false], ["2024", "4", "31", false],
    ["2000", "0", "1", false], ["1899", "1", "1", false], ["2000", "1", "", false],
    ["2e03", "1", "1", false], ["2000", "1.5", "1", false],
  ])("validates Gregorian date %s/%s/%s", (birthYear, birthMonth, birthDay, valid) => {
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, birthYear, birthMonth, birthDay }).success).toBe(valid);
  });
  it("rejects future birthdays", () => {
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, birthYear: String(new Date().getFullYear() + 1), birthMonth: "1", birthDay: "1" }).success).toBe(false);
  });
  it("preserves lunar input without applying Gregorian February rules", () => {
    const input = { ...EMPTY_PROFILE, calendar: "lunar", birthYear: "2000", birthMonth: "2", birthDay: "30", isLeapMonth: true };
    expect(profileSchema.parse(input)).toEqual(input);
    expect(profileSchema.safeParse({ ...input, birthDay: "31" }).success).toBe(false);
  });
  it("requires lunar date before a leap-month flag", () => {
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, isLeapMonth: true }).success).toBe(false);
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, calendar: "lunar", isLeapMonth: true }).success).toBe(false);
  });
  it("keeps unknown time empty and checks time only with a birth date", () => {
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, birthTime: "12:00" }).success).toBe(false);
    const dated = { ...EMPTY_PROFILE, birthYear: "2000", birthMonth: "1", birthDay: "1" };
    expect(profileSchema.safeParse({ ...dated, birthTime: "23:59" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...dated, birthTime: "24:00" }).success).toBe(false);
  });
  it("validates the timezone without guessing or calculating saju", () => {
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, timezone: "America/New_York" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...EMPTY_PROFILE, timezone: "Not/AZone" }).success).toBe(false);
  });
});
