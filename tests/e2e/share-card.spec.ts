import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test("explicit consent exports both real PNG sizes with safe accessible preview", async ({ page }, info) => {
  await page.goto("/test");
  await page.getByRole("button", { name: "15문항 시작하기" }).click();
  for (let i = 0; i < 15; i++) {
    await page.getByRole("radio", { name: "보통이다", exact: true }).check();
    await page.getByRole("button", { name: i === 14 ? "결과 보기" : "다음 문항", exact: true }).click();
  }
  const card = page.locator(".share-card-section");
  await expect(card.getByRole("heading", { name: "내 성향을 이미지로 담기" })).toBeVisible();
  await expect(card.locator(".share-card-scores > div")).toHaveCount(5);
  await expect(card.getByRole("checkbox")).not.toBeChecked();
  await expect(card.getByRole("button", { name: "PNG 이미지 저장" })).toBeDisabled();
  await card.getByRole("checkbox", { name: "내 성향 수치를 이미지 파일로 저장할게요." }).check();
  for (const [size, height] of [["square", 1080], ["portrait", 1920]] as const) {
    await card.getByLabel("이미지 크기").selectOption(size);
    const downloading = page.waitForEvent("download");
    await card.getByRole("button", { name: "PNG 이미지 저장" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`dark-mirror-profile-1080x${height}.png`);
    const path = info.outputPath(`profile-${size}.png`);
    await download.saveAs(path);
    const png = await readFile(path);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(height);
    expect(await download.failure()).toBeNull();
    await expect(card.getByRole("status")).toContainText("PNG 파일을 만들고 다운로드를 요청했어요");
  }
  await card.screenshot({ path: `test-results/phase5-${info.project.name}-card.png` });
  expect((await new AxeBuilder({ page }).include(".share-card-section").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await card.getByRole("checkbox").uncheck();
  await expect(card.getByRole("button", { name: "PNG 이미지 저장" })).toBeDisabled();
});

test("late canvas callback cannot download after navigation and deleting all local records", async ({ page }) => {
  const downloads: string[] = [];
  page.on("download", download => downloads.push(download.suggestedFilename()));
  await page.goto("/test");
  await page.getByRole("button", { name: "15문항 시작하기" }).click();
  for (let index = 0; index < 15; index++) {
    await page.getByRole("radio", { name: "보통이다", exact: true }).check();
    await page.getByRole("button", { name: index === 14 ? "결과 보기" : "다음 문항", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/result\/[a-f0-9-]+$/);
  const resultPath = new URL(page.url()).pathname;
  await page.evaluate(() => {
    const browser = window as typeof window & { resolvePendingCard?: () => Promise<void>; lateCardDownloadClicks?: number };
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalClick = HTMLAnchorElement.prototype.click;
    browser.lateCardDownloadClicks = 0;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) browser.lateCardDownloadClicks = (browser.lateCardDownloadClicks ?? 0) + 1;
      originalClick.call(this);
    };
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      const finishBlob = originalToBlob.bind(this);
      browser.resolvePendingCard = () => new Promise<void>(resolve => {
        finishBlob(blob => { callback(blob); queueMicrotask(resolve); }, type, quality);
      });
    };
  });
  const card = page.locator(".share-card-section");
  await card.getByRole("checkbox", { name: "내 성향 수치를 이미지 파일로 저장할게요." }).check();
  await card.getByRole("button", { name: "PNG 이미지 저장" }).click();
  await expect(card.getByRole("button", { name: "이미지 만드는 중…" })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => typeof (window as typeof window & { resolvePendingCard?: () => Promise<void> }).resolvePendingCard)).toBe("function");
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("button", { name: "모든 로컬 기록 삭제", exact: true }).click();
  await page.getByRole("button", { name: "확인하고 모든 로컬 기록 삭제", exact: true }).click();
  await page.evaluate(async () => {
    const browser = window as typeof window & { resolvePendingCard?: () => Promise<void> };
    if (!browser.resolvePendingCard) throw new Error("No pending canvas callback");
    await browser.resolvePendingCard();
  });
  expect(await page.evaluate(() => (window as typeof window & { lateCardDownloadClicks?: number }).lateCardDownloadClicks)).toBe(0);
  expect(downloads).toEqual([]);
  await page.goto(resultPath);
  await expect(page.getByRole("heading", { name: "이 결과를 찾을 수 없어요" })).toBeVisible();
});
