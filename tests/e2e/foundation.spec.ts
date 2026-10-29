import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("anonymous onboarding can be skipped", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "프로필 시작하기" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: "입력 없이 건너뛰기" }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("link", { name: "마이", exact: true }).click();
  await expect(page.getByRole("heading", { name: "익명 게스트님의 공간" })).toBeVisible();
  await expect(page.getByText("계산 준비 중", { exact: true })).toBeVisible();
});

test("profile validation, save, refresh, edit and reset", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("닉네임 (선택)").fill("가");
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await expect(page.getByText("닉네임은 2자 이상 입력해 주세요.")).toBeVisible();
  await expect(page.getByLabel("닉네임 (선택)")).toBeFocused();
  await page.getByLabel("닉네임 (선택)").fill("수윤");
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("link", { name: "마이", exact: true }).click();
  await expect(page.getByRole("heading", { name: "수윤님의 공간" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "수윤님의 공간" })).toBeVisible();
  await page.getByRole("link", { name: "프로필 수정" }).click();
  await expect(page.getByLabel("닉네임 (선택)")).toHaveValue("수윤");
  await page.getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("button", { name: "임시 프로필 초기화" }).click();
  await expect(page.getByText("저장된 임시 프로필이 없어요.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "수윤님의 공간" })).toHaveCount(0);
});

test("solar validation and unverified lunar input remain separate", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("태어난 연도").fill("2000");
  await page.getByLabel("태어난 월").fill("2");
  await page.getByLabel("태어난 일").fill("30");
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await expect(page.getByText("실제로 존재하는 양력 날짜를 입력해 주세요.")).toBeVisible();
  await page.getByLabel("달력 종류").selectOption("lunar");
  await expect(page.getByText("음력 날짜 검증 대기", { exact: true })).toBeVisible();
  await page.getByLabel("음력 윤달에 태어났어요").check();
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("link", { name: "마이", exact: true }).click();
  await expect(page.getByText("음력 날짜 검증 대기:", { exact: false })).toBeVisible();
});

test("five tabs have working routes and indicate current page", async ({ page }) => {
  await page.goto("/");
  for (const [label, path] of [["테스트", "/test"], ["AI 체험", "/simulation"], ["궁합", "/match"], ["마이", "/me"], ["홈", "/"]]) {
    const link = page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: label, exact: true });
    await link.click();
    await expect(page).toHaveURL(`http://127.0.0.1:3100${path}`);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  }
});

test("auth is explicitly unavailable and does not collect an email", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "계정 연결은 준비 중이에요" })).toBeVisible();
  await expect(page.getByText("로컬 데모 · 인증 미연결", { exact: true })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await page.getByRole("link", { name: "게스트로 계속하기" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("storage denial falls back to memory without blocking onboarding", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await page.goto("/onboarding");
  await expect(page.getByText("브라우저 임시 저장을 사용할 수 없어", { exact: false })).toBeVisible();
  await page.getByLabel("닉네임 (선택)").fill("임시사용자");
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("link", { name: "마이", exact: true }).click();
  await expect(page.getByRole("heading", { name: "임시사용자님의 공간" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "익명 게스트님의 공간" })).toBeVisible();
});

test("pages fit the viewport and pass automated accessibility checks", async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  for (const path of ["/", "/onboarding", "/auth", "/me", "/test", "/simulation", "/match"]) {
    await page.goto(path);
    if (path === "/onboarding") await expect(page.getByLabel("닉네임 (선택)")).toBeVisible();
    if (path === "/me") await expect(page.getByRole("heading", { name: "익명 게스트님의 공간" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations, `accessibility ${path}`).toEqual([]);
    if (path === "/" || path === "/onboarding") await page.screenshot({ path: `test-results/preview-${testInfo.project.name}-${path === "/" ? "home" : "onboarding"}.png`, fullPage: true });
  }
  expect(runtimeErrors).toEqual([]);
});

test("keyboard skip link moves focus to main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 건너뛰기" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("expiry clears a profile even while editing it", async ({ page }) => {
  await page.clock.install();
  await page.goto("/onboarding");
  await page.getByLabel("닉네임 (선택)").fill("만료예정");
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("link", { name: "프로필 수정" }).click();
  await expect(page.getByLabel("닉네임 (선택)")).toHaveValue("만료예정");
  await page.clock.fastForward(24 * 60 * 60 * 1000 + 1000);
  await expect(page.getByLabel("닉네임 (선택)")).toHaveValue("");
});
