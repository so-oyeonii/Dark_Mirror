import { z } from "zod";
import type { CalculateSaju, FiveElement, SajuPillar } from "./saju-contract";

const birthInput = z.object({
  calendar: z.enum(["solar", "lunar"]),
  birthYear: z.string().trim(),
  birthMonth: z.string().trim(),
  birthDay: z.string().trim(),
  birthTime: z.string().trim().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
  isLeapMonth: z.boolean(),
  timezone: z.string().trim(),
});

const ELEMENTS: Record<string, FiveElement> = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const KST = 9 * 60 * MINUTE;
// Versioned validation range, not the upstream library's much larger advertised range.
const MIN_YEAR = 1989;
const MAX_YEAR = 2026;
const BOUNDARY_MARGIN = 2 * MINUTE;

/** Browser-local calculation. No network, persistence, or logging of birth information. */
export const calculateSaju: CalculateSaju = async (profile) => {
  const parsed = birthInput.safeParse(profile);
  if (!parsed.success) return { status: "error", message: "출생정보의 입력 형식을 확인해 주세요." };
  const input = parsed.data;
  const dates = [input.birthYear, input.birthMonth, input.birthDay];
  if (dates.every(value => value === "") && !input.birthTime && !input.isLeapMonth) {
    return { status: "missing", message: "출생정보를 입력하면 사주 명식을 확인할 수 있어요. 입력은 선택이에요." };
  }
  if (!/^\d{4}$/.test(input.birthYear) || !/^\d{1,2}$/.test(input.birthMonth) || !/^\d{1,2}$/.test(input.birthDay)) {
    return { status: "error", message: "생년월일을 모두 숫자로 입력해 주세요." };
  }
  if (input.timezone !== "Asia/Seoul") {
    return { status: "unsupported", message: "현재는 Asia/Seoul 출생 시간대만 지원해요. 다른 시간대는 아직 검증하지 않았어요." };
  }
  const [year, month, day] = dates.map(Number);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return { status: "unsupported", message: "현재 검증 범위는 1989~2026년이에요. 이전 한국 표준시·서머타임과 범위 밖 연도는 지원하지 않아요." };
  }
  if (input.calendar === "solar" && input.isLeapMonth) {
    return { status: "error", message: "윤달은 음력 날짜에만 선택할 수 있어요." };
  }

  try {
    const engine = await import("manseryeok");
    const solar = input.calendar === "lunar" ? engine.lunarToSolar(year, month, day, input.isLeapMonth) : { year, month, day };
    if (!engine.isValidSolarDate(solar.year, solar.month, solar.day)) {
      return { status: "error", message: "실제로 존재하는 날짜인지 확인해 주세요." };
    }
    if (solar.year < MIN_YEAR || solar.year > MAX_YEAR) {
      return { status: "unsupported", message: "음력을 변환한 양력 날짜가 검증 범위인 1989~2026년을 벗어나요." };
    }
    const start = Date.UTC(solar.year, solar.month - 1, solar.day) - KST;
    const hasTime = input.birthTime !== "";
    const [hour, minute] = hasTime ? input.birthTime.split(":").map(Number) : [12, 0];
    const instant = start + (hour * 60 + minute) * MINUTE;
    if (start > Date.now() || (hasTime && instant > Date.now())) {
      return { status: "error", message: "미래의 출생 날짜·시간은 계산할 수 없어요." };
    }
    const boundaries = engine.getSolarTermsOfYear(solar.year).filter(term => term.index % 2 === 0);
    const ambiguous = boundaries.some(term => {
      const boundary = term.date.getTime();
      return hasTime
        ? Math.abs(instant - boundary) <= BOUNDARY_MARGIN
        : boundary + BOUNDARY_MARGIN >= start && boundary - BOUNDARY_MARGIN < start + DAY;
    });
    if (ambiguous) {
      return { status: "unsupported", message: hasTime
        ? "절기 전환 전후 2분 이내라 연주·월주를 확정하지 않아요. 분 단위 절기 자료의 오차와 출생기록을 함께 확인해야 해요."
        : "이 날짜는 절기 전환 경계와 겹쳐요. 출생시간을 모르면 연주·월주를 확정할 수 없어 명식을 표시하지 않아요." };
    }
    const result = engine.calculateFourPillars({ ...solar, hour, minute, dayBoundary: "midnight" });
    const pillar = (value: typeof result.year, elements: typeof result.yearElement): SajuPillar => ({
      stem: value.heavenlyStem,
      branch: value.earthlyBranch,
      stemElement: ELEMENTS[elements.stem],
      branchElement: ELEMENTS[elements.branch],
    });
    const pillars = {
      year: pillar(result.year, result.yearElement),
      month: pillar(result.month, result.monthElement),
      day: pillar(result.day, result.dayElement),
      hour: hasTime ? pillar(result.hour, result.hourElement) : null,
    };
    const elements: Record<FiveElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    for (const value of Object.values(pillars)) {
      if (value) { elements[value.stemElement]++; elements[value.branchElement]++; }
    }
    return {
      status: "ready", pillars, elements,
      engine: { name: "manseryeok", version: "2.0.0 / DARK MIRROR 1" },
      conventions: [
        "Asia/Seoul 한국 표준시(UTC+9), 1989~2026년 범위에서 계산해요.",
        "연주는 입춘, 월주는 12절의 절입 시각을 기준으로 바뀌어요. 음력의 월건과 다를 수 있어요.",
        "일주는 자정(00:00)에 바뀌며 23시대 시주도 당일 일간을 사용해요. 자시는 23:00~00:59예요.",
        "출생지 경도·진태양시 보정은 적용하지 않아요. 관법에 따라 다른 명식이 나올 수 있어요.",
        "오행은 표시된 천간·지지의 대표 오행 개수예요. 지장간·강약·길흉이나 관계 테스트 점수가 아니에요.",
      ],
      warnings: [
        "전통 역법을 활용한 재미와 자기성찰용 정보이며 성격·관계·미래를 입증하거나 진단하지 않아요.",
        ...(!hasTime ? ["출생시간을 몰라 시주를 계산하지 않았어요. 자정 기준 일주이며 23시부터 날짜를 바꾸는 관법과는 다를 수 있어요."] : []),
        ...(hasTime && hour === 23 ? ["23시대는 날짜 전환 관법에 따라 일주·시주가 달라질 수 있어요. 여기서는 자정 전까지 당일로 계산해요."] : []),
      ],
    };
  } catch (error) {
    return { status: "error", message: error instanceof RangeError
      ? "해당 날짜나 음력 윤달이 존재하지 않아요. 날짜와 윤달 여부를 확인해 주세요."
      : "사주 계산기를 불러오거나 계산하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
};
