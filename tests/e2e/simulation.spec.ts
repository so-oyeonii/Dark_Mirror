import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function start(page: Page, scenario = "연인과의 대화") {
  await page.goto("/simulation");
  await page.getByRole("radio", { name: scenario, exact: true }).check();
  await expect(page.getByText("내가 그런 말을 했다고? 너는 항상 일을 과장하더라.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "동의하고 데모 시작" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "가상의 갈등 대사와 중단 방법을 확인했어요." }).check();
  await page.getByRole("button", { name: "동의하고 데모 시작" }).click();
  await expect(page).toHaveURL(/\/simulation\/[0-9a-f-]+$/);
}

test("consented local scene completes five turns, restores and sends no remote writes", async ({ page }, info) => {
  const writes: string[] = [];
  page.on("request", request => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url()); });
  await start(page);
  await expect(page.getByRole("button", { name: "체험 중단", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "안전 지원으로 전환", exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/phase3-${info.project.name}-conversation.png`, fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "내가 느낀 점부터 차분히 말하고 싶어요.", exact: true }).click();
  await page.reload();
  await expect(page.getByText("내 답변 1 / 5", { exact: true })).toBeVisible();
  for (let index = 1; index < 5; index++) await page.getByRole("button", { name: "내가 느낀 점부터 차분히 말하고 싶어요.", exact: true }).click();
  await expect(page).toHaveURL(/\/simulation\/[0-9a-f-]+\/result$/);
  await expect(page.getByRole("heading", { name: "짧은 연습을 마쳤어요" })).toBeVisible();
  await expect(page.getByText("이번 로컬 체험에서 5번 답변했어요.", { exact: false })).toBeVisible();
  await page.screenshot({ path: `test-results/phase3-${info.project.name}-result.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toEqual([]);
});

test("manual stop and support end immediately; explicit danger does not continue roleplay", async ({ page }) => {
  await start(page, "친구의 부탁");
  await page.getByRole("button", { name: "체험 중단", exact: true }).click();
  await expect(page.getByRole("heading", { name: "체험을 여기서 멈췄어요" })).toBeVisible();
  await start(page, "직장에서의 책임");
  await page.getByRole("button", { name: "안전 지원으로 전환", exact: true }).click();
  await expect(page.getByText("역할극을 끝냈어요. 지금의 안전을 먼저 살펴주세요.", { exact: true })).toBeVisible();
  await start(page);
  await page.getByRole("textbox", { name: "직접 답하기 (선택)" }).fill("지금 위험해요");
  await page.getByRole("button", { name: "답변 보내기" }).click();
  await expect(page.getByText("역할극을 끝냈어요. 지금의 안전을 먼저 살펴주세요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "답변 보내기" })).toHaveCount(0);
});

test("expired/deleted local scene disappears and blocked storage still allows a demo", async ({ page }) => {
  await page.clock.install();
  await start(page);
  const path = new URL(page.url()).pathname;
  await page.clock.fastForward(24 * 60 * 60 * 1000 + 1);
  await expect(page.getByRole("heading", { name: "이 대화 기록을 찾을 수 없어요" })).toBeVisible();
  await start(page);
  await page.getByRole("button", { name: "체험 중단", exact: true }).click();
  const resultPath = new URL(page.url()).pathname;
  await page.goto("/simulation");
  await page.getByRole("button", { name: "대화 기록 전체 삭제", exact: true }).click();
  await page.getByRole("button", { name: "모든 대화 삭제", exact: true }).click();
  await page.goto(resultPath);
  await expect(page.getByRole("heading", { name: "이 대화 기록을 찾을 수 없어요" })).toBeVisible();
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "이 대화 기록을 찾을 수 없어요" })).toBeVisible();
  await page.addInitScript(() => { Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } }); });
  await start(page);
  await page.getByRole("button", { name: "체험 중단", exact: true }).click();
  await expect(page.getByRole("heading", { name: "체험을 여기서 멈췄어요" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "이 대화 기록을 찾을 수 없어요" })).toBeVisible();
});
