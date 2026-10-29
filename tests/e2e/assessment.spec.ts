import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function start(page: Page) {
  await page.goto("/test");
  await page.getByRole("button", { name: "15문항 시작하기" }).click();
}
async function finishFrom(page: Page, index = 0, label = "보통이다") {
  for (let current = index; current < 15; current++) {
    await expect(page.getByText(`문항 ${current + 1} / 15`, { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: label, exact: true }).check();
    await page.getByRole("button", { name: current === 14 ? "결과 보기" : "다음 문항", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/result\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "지금의 답변에 비친 나" })).toBeVisible();
  return new URL(page.url()).pathname;
}
async function checkA11y(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
}

test("guest finishes all questions with back navigation, refresh, accessible chart and no remote writes", async ({ page }, testInfo) => {
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("request", request => { if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method())) writes.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await start(page);
  await expect(page.getByRole("radio")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "다음 문항" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "이전 문항" })).toBeDisabled();
  await page.screenshot({ path: `test-results/phase2-${testInfo.project.name}-question.png`, fullPage: true });
  await checkA11y(page);
  await page.getByRole("radio", { name: "그런 편이다", exact: true }).check();
  await page.getByRole("button", { name: "다음 문항" }).click();
  await page.getByRole("radio", { name: "보통이다", exact: true }).check();
  await page.reload();
  await expect(page.getByText("문항 2 / 15", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "보통이다", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "이전 문항" }).click();
  await expect(page.getByRole("radio", { name: "그런 편이다", exact: true })).toBeChecked();
  await finishFrom(page);
  await expect(page.locator(".dimension-value")).toHaveCount(5);
  for (const item of await page.locator(".dimension-value").all()) await expect(item).toHaveText("50.0/ 100");
  await expect(page.getByText("검증된 심리검사나 진단 결과가 아니에요", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "테스트", exact: true })).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(page.getByRole("heading", { name: "지금의 답변에 비친 나" })).toBeVisible();
  await page.screenshot({ path: `test-results/phase2-${testInfo.project.name}-result.png`, fullPage: true });
  await checkA11y(page);
  await page.getByRole("link", { name: "내 검사 기록", exact: true }).click();
  await expect(page.locator(".history-list > li")).toHaveCount(1);
  await checkA11y(page);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("retests have separate results, unavailable in a fresh tab, and deletion revokes local URLs", async ({ page, context }) => {
  await start(page);
  const first = await finishFrom(page);
  const freshTab = await context.newPage();
  await freshTab.goto(first);
  await expect(freshTab.getByRole("heading", { name: "이 결과를 찾을 수 없어요" })).toBeVisible();
  await freshTab.close();
  await page.getByRole("link", { name: "다시 검사하기", exact: true }).click();
  await page.getByRole("button", { name: "15문항 시작하기" }).click();
  const second = await finishFrom(page, 0, "매우 그렇다");
  expect(second).not.toBe(first);
  for (const item of await page.locator(".dimension-value").all()) await expect(item).toHaveText("66.7/ 100");
  await page.goto("/me");
  await expect(page.locator(".history-list > li")).toHaveCount(2);
  const firstRecord = page.locator(".history-list > li").filter({ has: page.locator(`a[href="${first}"]`) });
  await firstRecord.getByRole("button", { name: /검사 기록 삭제$/ }).click();
  await firstRecord.getByRole("button", { name: "이 기록 삭제", exact: true }).click();
  await expect(page.locator(".history-list > li")).toHaveCount(1);
  await page.goto(first);
  await expect(page.getByRole("heading", { name: "이 결과를 찾을 수 없어요" })).toBeVisible();
  await page.goto(second);
  await expect(page.getByRole("heading", { name: "지금의 답변에 비친 나" })).toBeVisible();
  await page.goto("/me");
  await page.getByRole("button", { name: "검사 기록 전체 삭제" }).click();
  await page.getByRole("button", { name: "모든 검사 기록 삭제" }).click();
  await page.goto(second);
  await expect(page.getByRole("heading", { name: "이 결과를 찾을 수 없어요" })).toBeVisible();
});

test("restart requires an explicit choice and resets current answers", async ({ page }) => {
  await start(page);
  await page.getByRole("radio", { name: "매우 그렇다", exact: true }).check();
  await page.getByRole("button", { name: "다음 문항" }).click();
  await page.getByRole("button", { name: "처음부터 다시 시작", exact: true }).click();
  await page.getByRole("button", { name: "계속 이어서 답하기" }).click();
  await expect(page.getByText("문항 2 / 15", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "처음부터 다시 시작", exact: true }).click();
  await page.getByRole("button", { name: "답변 지우고 다시 시작" }).click();
  await expect(page.getByText("문항 1 / 15", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 문항" })).toBeDisabled();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
});

test("storage denial still allows completing the test but refresh loses the local result", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await start(page);
  await finishFrom(page);
  await expect(page.getByText("브라우저 저장이 제한되어 현재 화면에서만 유지돼요.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "이 결과를 찾을 수 없어요" })).toBeVisible();
});

test("creation-based expiry clears active and completed views without refresh", async ({ page }) => {
  await page.clock.install();
  await start(page);
  await page.getByRole("radio", { name: "보통이다", exact: true }).check();
  await page.clock.fastForward(24 * 60 * 60 * 1000 + 1);
  await expect(page.getByRole("button", { name: "15문항 시작하기" })).toBeVisible();
  await page.getByRole("button", { name: "15문항 시작하기" }).click();
  await page.clock.fastForward(23 * 60 * 60 * 1000);
  await finishFrom(page);
  await page.clock.fastForward(60 * 60 * 1000 + 1);
  await expect(page.getByRole("heading", { name: "이 결과를 찾을 수 없어요" })).toBeVisible();
});

test("corrupt stored state and arbitrary result URLs do not create results", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("dark-mirror:assessments:v1", "not-json"));
  await page.goto("/test");
  await expect(page.getByRole("button", { name: "15문항 시작하기" })).toBeVisible();
  await expect(page.getByText("검사 기록을 정리했어요.", { exact: false })).toBeVisible();
  await page.goto("/result/not-a-real-attempt");
  await expect(page.getByRole("heading", { name: "이 결과를 찾을 수 없어요" })).toBeVisible();
  await checkA11y(page);
});
