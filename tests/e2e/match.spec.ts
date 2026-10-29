import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("fictional pair needs both consent selections and revocation hides report", async ({ page }, info) => {
  const writes: string[] = [];
  page.on("request", req => { if (req.method() === "POST") writes.push(req.url()); });
  await page.goto("/match");
  await page.getByRole("button", { name: "가상 A의 초대 만들기" }).click();
  await page.getByRole("group", { name: "가상 A가 나눌 예시 정보" }).getByRole("checkbox", { name: "5개 성향 수치" }).check();
  await page.getByRole("button", { name: "가상 A 동의 반영" }).click();
  await expect(page.getByRole("heading", { name: "서로 다른 반응, 대화의 출발점" })).toHaveCount(0);
  await page.getByRole("button", { name: "가상 B로 초대 수락" }).click();
  await page.getByRole("group", { name: "가상 B가 나눌 예시 정보" }).getByRole("checkbox", { name: "5개 성향 수치" }).check();
  await page.getByRole("button", { name: "가상 B 동의 반영" }).click();
  await expect(page.getByRole("heading", { name: "서로 다른 반응, 대화의 출발점" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MBTI로 여는 가벼운 이야기" })).toHaveCount(0);
  await page.getByRole("link", { name: "이 탭에서 예시 결과 열기" }).click();
  await expect(page).toHaveURL(/\/match\/[a-f0-9-]+$/);
  const url = page.url();
  await page.screenshot({ path: `test-results/phase4-${info.project.name}-match.png`, fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "가상 B 동의 철회" }).click();
  await expect(page.getByRole("heading", { name: "동의를 철회했어요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "서로 다른 반응, 대화의 출발점" })).toHaveCount(0);
  await page.getByRole("button", { name: "궁합 예시 기록 삭제" }).click();
  await expect(page.getByRole("heading", { name: "이 궁합 예시를 찾을 수 없어요" })).toBeVisible();
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "이 궁합 예시를 찾을 수 없어요" })).toBeVisible();
  expect(writes).toEqual([]);
});

test("72h expiry and refresh invalidate the in-memory example", async ({ page }) => {
  await page.clock.install();
  await page.goto("/match");
  await page.getByRole("button", { name: "가상 A의 초대 만들기" }).click();
  await expect(page.getByRole("button", { name: "가상 B로 초대 수락" })).toBeVisible();
  await page.clock.fastForward(72 * 60 * 60 * 1000);
  await expect(page.getByRole("heading", { name: "초대가 만료됐어요" })).toBeVisible();
  await page.getByRole("button", { name: "새 가상 초대 만들기" }).click();
  await expect(page.getByRole("button", { name: "가상 B로 초대 수락" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "가상 A의 초대 만들기" })).toBeVisible();
});

test("production build does not activate the development-only server API", async ({ request }) => {
  const result = await request.post("/api/demo/simulation", { data: { action: "start", consent: true, scenarioId: "LOVE" } });
  expect(result.status()).toBe(503);
  expect(result.headers()["cache-control"]).toBe("no-store");
});
