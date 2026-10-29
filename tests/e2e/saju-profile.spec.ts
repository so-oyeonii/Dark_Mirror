import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

async function saveProfile(page: Page, options: { time?: string; timezone?: string } = {}) {
  await page.goto("/onboarding");
  await page.getByLabel("닉네임 (선택)").fill("공유금지이름");
  await page.getByLabel("MBTI (선택)").selectOption("INFP");
  await page.getByLabel("태어난 연도").fill("2000");
  await page.getByLabel("태어난 월").fill("8");
  await page.getByLabel("태어난 일").fill("15");
  if (options.time) await page.getByLabel("출생시간 (선택)").fill(options.time);
  if (options.timezone) await page.getByLabel("출생 시간대").fill(options.timezone);
  await page.getByRole("button", { name: "임시 프로필 저장", exact: true }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("link", { name: "사주·MBTI 프로필 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
}

type PendingCardWindow = Window & typeof globalThis & { finishSajuCard?: () => Promise<void>; sajuDownloadClicks?: number };
async function holdPng(page: Page) {
  await page.evaluate(() => {
    const browser = window as PendingCardWindow;
    const original = HTMLCanvasElement.prototype.toBlob;
    const click = HTMLAnchorElement.prototype.click;
    browser.sajuDownloadClicks = 0;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) browser.sajuDownloadClicks = (browser.sajuDownloadClicks ?? 0) + 1;
      click.call(this);
    };
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      const finish = original.bind(this);
      browser.finishSajuCard = () => new Promise<void>(resolve => {
        finish(blob => { callback(blob); queueMicrotask(resolve); }, type, quality);
      });
    };
  });
  const card = page.locator(".saju-share-card");
  await card.getByRole("checkbox", { name: "미리본 오행 요약과 선택한 항목을 이미지로 저장할게요." }).check();
  await card.getByRole("button", { name: "사주 PNG 이미지 저장" }).click();
  await expect(card.getByRole("button", { name: "이미지 만드는 중…" })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => typeof (window as PendingCardWindow).finishSajuCard)).toBe("function");
}
async function finishPng(page: Page) {
  await page.evaluate(async () => {
    const finish = (window as PendingCardWindow).finishSajuCard;
    if (!finish) throw new Error("No pending PNG callback");
    await finish();
  });
  expect(await page.evaluate(() => (window as PendingCardWindow).sajuDownloadClicks)).toBe(0);
}

test("home opens the empty profile and skipped input never invents a chart", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "사주·MBTI 프로필 보기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "살펴볼 임시 프로필이 없어요" })).toBeVisible();
  await page.getByRole("link", { name: "프로필 입력하기", exact: true }).click();
  await page.getByRole("button", { name: "입력 없이 건너뛰기" }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("link", { name: "사주·MBTI 프로필 보기", exact: true }).click();
  await expect(page.getByText("출생정보를 입력하면 살펴볼 수 있어요", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MBTI는 선택해도, 비워 두어도 괜찮아요" })).toBeVisible();
  await expect(page.locator(".saju-pillars")).toHaveCount(0);
  await expect(page.locator(".saju-share-card")).toHaveCount(0);
});

test("unknown birth time shows three pillars, separated MBTI and an accessible 360px layout", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const externalRequests: string[] = [];
  page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1:3100")) externalRequests.push(request.url()); });
  await saveProfile(page);
  await expect(page.getByRole("table", { name: "입력한 출생정보의 명식" })).toBeVisible();
  await expect(page.locator(".saju-pillars td", { hasText: "미상" })).toHaveCount(2);
  await expect(page.getByText("출생시간 미상 · 시주 제외", { exact: true })).toBeVisible();
  const counts = await page.locator(".saju-result .saju-element-counts dd").allTextContents();
  expect(counts.reduce((sum, value) => sum + parseInt(value), 0)).toBe(6);
  await expect(page.getByRole("heading", { name: "INFP · 나에게 건네는 질문", exact: true })).toBeVisible();
  const preview = page.getByRole("region", { name: "사주 카드 내용 미리보기" });
  await expect(preview).not.toContainText("공유금지이름");
  await expect(preview).not.toContainText("2000");
  await expect(preview).not.toContainText("INFP");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("saju-profile.png"), fullPage: true });
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("unsupported timezone leaves MBTI available but never exposes a chart or download", async ({ page }) => {
  await saveProfile(page, { timezone: "America/New_York", time: "12:00" });
  await expect(page.getByText("이 입력은 아직 계산할 수 없어요", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "INFP · 나에게 건네는 질문" })).toBeVisible();
  await expect(page.locator(".saju-pillars")).toHaveCount(0);
  await expect(page.locator(".saju-share-card")).toHaveCount(0);
});

test("invalid lunar leap month displays a retryable error without retaining the old chart", async ({ page }) => {
  await saveProfile(page);
  await expect(page.locator(".saju-pillars")).toBeVisible();
  await page.getByRole("link", { name: "프로필 수정", exact: true }).click();
  await page.getByLabel("달력 종류").selectOption("lunar");
  await page.getByLabel("태어난 연도").fill("2023");
  await page.getByLabel("태어난 월").fill("3");
  await page.getByLabel("음력 윤달에 태어났어요").check();
  await page.getByRole("button", { name: "임시 프로필 저장", exact: true }).click();
  await expect(page).toHaveURL(/\/test$/);
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("link", { name: "사주·MBTI 프로필 보기", exact: true }).click();
  await expect(page.locator(".saju-result").getByRole("alert")).toContainText("계산을 마치지 못했어요");
  await expect(page.locator(".saju-pillars")).toHaveCount(0);
  await expect(page.locator(".saju-share-card")).toHaveCount(0);
  await page.getByRole("button", { name: "계산 다시 시도" }).click();
  await expect(page.locator(".saju-result").getByRole("alert")).toContainText("계산을 마치지 못했어요");
});

test("both actual PNG sizes require explicit consent, and MBTI inclusion resets consent", async ({ page }, info) => {
  await saveProfile(page, { time: "12:00" });
  const card = page.locator(".saju-share-card");
  await expect(card).toBeVisible();
  const consent = card.getByRole("checkbox", { name: "미리본 오행 요약과 선택한 항목을 이미지로 저장할게요." });
  const mbti = card.getByRole("checkbox", { name: "선택한 MBTI(INFP)와 성찰 질문도 담을게요." });
  const save = card.getByRole("button", { name: "사주 PNG 이미지 저장" });
  await expect(consent).not.toBeChecked(); await expect(mbti).not.toBeChecked(); await expect(save).toBeDisabled();
  await consent.check(); await mbti.check();
  await expect(consent).not.toBeChecked(); await expect(save).toBeDisabled();
  await expect(card.getByRole("heading", { name: "INFP · 나에게 건네는 질문" })).toBeVisible();
  await consent.check();
  for (const [size, height] of [["square", 1080], ["portrait", 1920]] as const) {
    await card.getByLabel("사주 카드 이미지 크기").selectOption(size);
    const downloading = page.waitForEvent("download");
    await save.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`dark-mirror-saju-1080x${height}.png`);
    const path = info.outputPath(`saju-${size}.png`);
    await download.saveAs(path);
    const png = await readFile(path);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(1080); expect(png.readUInt32BE(20)).toBe(height);
    expect(await download.failure()).toBeNull();
  }
  await page.reload();
  await expect(consent).not.toBeChecked(); await expect(mbti).not.toBeChecked();
});

test("navigation and deletion cancel a pending PNG and clear the result", async ({ page }) => {
  await saveProfile(page);
  await holdPng(page);
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("button", { name: "임시 프로필 초기화", exact: true }).click();
  await finishPng(page);
  await page.getByRole("link", { name: "사주·MBTI 프로필 보기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "살펴볼 임시 프로필이 없어요" })).toBeVisible();
});

test("expiry removes the calculated profile and cancels a pending PNG", async ({ page }) => {
  await page.clock.install();
  await saveProfile(page);
  await holdPng(page);
  await page.clock.fastForward(24 * 60 * 60 * 1000 + 1000);
  await expect(page.getByRole("heading", { name: "살펴볼 임시 프로필이 없어요" })).toBeVisible();
  await expect(page.locator(".saju-pillars")).toHaveCount(0);
  await finishPng(page);
});

test("withdrawing consent while PNG is pending cancels the download", async ({ page }) => {
  await saveProfile(page);
  await holdPng(page);
  const card = page.locator(".saju-share-card");
  await card.getByRole("checkbox", { name: "미리본 오행 요약과 선택한 항목을 이미지로 저장할게요." }).uncheck();
  await finishPng(page);
  await expect(card.getByRole("button", { name: "사주 PNG 이미지 저장" })).toBeDisabled();
});

for (const action of ["delete", "expire"] as const) {
  test(`late engine loading cannot restore a profile after ${action}`, async ({ page }) => {
    await page.clock.install();
    let release: () => void = () => {};
    let heldUrl = "";
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/_next/static/chunks/*.js", async route => {
      const response = await route.fetch();
      const body = await response.text();
      // Match the actual lazy engine, not an application/test fixture or generated chunk ID.
      if (body.includes("유효하지 않은 양력 날짜입니다")) {
        heldUrl = route.request().url();
        await gate;
      }
      await route.fulfill({ response, body });
    });
    try {
      await saveProfile(page);
      await expect.poll(() => heldUrl).not.toBe("");
      await expect(page.locator(".saju-result").getByRole("status")).toContainText("계산 결과를 확인하고 있어요");
      if (action === "delete") {
        await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "마이", exact: true }).click();
        await page.getByRole("button", { name: "임시 프로필 초기화", exact: true }).click();
        await page.getByRole("link", { name: "사주·MBTI 프로필 보기", exact: true }).click();
      } else {
        await page.clock.fastForward(24 * 60 * 60 * 1000 + 1000);
      }
      await expect(page.getByRole("heading", { name: "살펴볼 임시 프로필이 없어요" })).toBeVisible();
      const loaded = page.waitForResponse(response => response.url() === heldUrl);
      release();
      await loaded;
      await expect(page.locator(".saju-pillars")).toHaveCount(0);
      await expect(page.locator(".saju-share-card")).toHaveCount(0);
      expect(await page.evaluate(() => sessionStorage.getItem("dark-mirror:guest:v1"))).toBeNull();
    } finally { release(); }
  });
}
