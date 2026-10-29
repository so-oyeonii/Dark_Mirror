import { z } from "zod";

export const MBTI_TYPES = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"] as const;

// These fields preserve the INPUT calendar. They are not a converted Gregorian date.
export const profileSchema = z.object({
  nickname: z.string().trim().max(20, "닉네임은 20자 이내로 입력해 주세요.").refine(v => v.length === 0 || v.length >= 2, "닉네임은 2자 이상 입력해 주세요."),
  mbti: z.union([z.enum(MBTI_TYPES), z.literal("")]),
  calendar: z.enum(["solar", "lunar"]),
  birthYear: z.string().trim(),
  birthMonth: z.string().trim(),
  birthDay: z.string().trim(),
  birthTime: z.string().trim(),
  isLeapMonth: z.boolean(),
  timezone: z.string().trim().min(1, "출생 시간대를 입력해 주세요.").max(80).refine(value => {
    try { new Intl.DateTimeFormat("ko-KR", { timeZone: value }); return true; } catch { return false; }
  }, "유효한 시간대를 입력해 주세요. 예: Asia/Seoul"),
}).superRefine((value, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  const dates = [value.birthYear, value.birthMonth, value.birthDay];
  const hasDate = dates.some(Boolean);
  if (hasDate) {
    if (!dates.every(Boolean)) issue("birthYear", "생년월일을 모두 입력하거나 모두 비워 주세요.");
    else {
      const [year, month, day] = dates.map(Number);
      const numeric = /^\d{4}$/.test(value.birthYear) && /^\d{1,2}$/.test(value.birthMonth) && /^\d{1,2}$/.test(value.birthDay);
      if (!numeric || year < 1900 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > (value.calendar === "lunar" ? 30 : 31)) {
        issue("birthYear", "생년월일의 숫자와 범위를 확인해 주세요. 연도는 1900년부터 올해까지 입력할 수 있어요.");
      } else if (value.calendar === "solar") {
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) issue("birthYear", "실제로 존재하는 양력 날짜를 입력해 주세요.");
        else if (date.getTime() > Date.now()) issue("birthYear", "미래의 생년월일은 입력할 수 없어요.");
      }
    }
  }
  if (value.birthTime && (!hasDate || !dates.every(Boolean))) issue("birthTime", "출생시간을 입력하려면 생년월일도 입력해 주세요.");
  if (value.birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.birthTime)) issue("birthTime", "출생시간은 00:00~23:59로 입력해 주세요.");
  if (value.isLeapMonth && (value.calendar !== "lunar" || !dates.every(Boolean))) issue("isLeapMonth", "윤달 여부는 음력 생년월일을 입력했을 때 선택해 주세요.");
});

export type Profile = z.infer<typeof profileSchema>;
export const EMPTY_PROFILE: Profile = {
  nickname: "", mbti: "", calendar: "solar", birthYear: "", birthMonth: "", birthDay: "", birthTime: "", isLeapMonth: false, timezone: "Asia/Seoul",
};

export function profileIssues(error: z.ZodError): Partial<Record<keyof Profile, string>> {
  const fields: Partial<Record<keyof Profile, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof Profile;
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
