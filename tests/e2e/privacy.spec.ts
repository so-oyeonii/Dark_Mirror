import { expect, test } from "@playwright/test";

test("all-local deletion removes every app store and keeps unrelated storage", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("닉네임 (선택)").fill("삭제확인");
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await page.getByRole("button", { name: "15문항 시작하기" }).click();
  await page.getByRole("radio", { name: "보통이다", exact: true }).check();
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "AI 체험", exact: true }).click();
  await page.getByRole("checkbox", { name: "가상의 갈등 대사와 중단 방법을 확인했어요." }).check();
  await page.getByRole("button", { name: "동의하고 데모 시작" }).click();
  await expect(page).toHaveURL(/\/simulation\/[a-f0-9-]+$/);
  const sceneUrl = page.url();
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "궁합", exact: true }).click();
  await page.getByRole("button", { name: "가상 A의 초대 만들기" }).click();
  await expect(page.getByRole("button", { name: "가상 B로 초대 수락" })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("unrelated-example", "keep"));
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "마이", exact: true }).click();
  await page.getByRole("button", { name: "모든 로컬 기록 삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제 취소", exact: true }).click();
  await expect(page.getByRole("heading", { name: "삭제확인님의 공간" })).toBeVisible();
  await page.getByRole("button", { name: "모든 로컬 기록 삭제", exact: true }).click();
  await page.getByRole("button", { name: "확인하고 모든 로컬 기록 삭제", exact: true }).click();
  await expect(page.getByText("이 탭의 프로필·검사·대화와 궁합 예시 기록을 모두 지웠어요.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(["unrelated-example"]);
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "궁합", exact: true }).click();
  await expect(page.getByRole("button", { name: "가상 A의 초대 만들기" })).toBeVisible();
  await page.goto(sceneUrl);
  await expect(page.getByRole("heading", { name: "이 대화 기록을 찾을 수 없어요" })).toBeVisible();
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "익명 게스트님의 공간" })).toBeVisible();
});

test("storage deletion failure does not falsely report complete erasure", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("닉네임 (선택)").fill("저장실패확인");
  await page.getByRole("button", { name: "임시 프로필 저장" }).click();
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "마이", exact: true }).click();
  await page.evaluate(() => { Storage.prototype.removeItem = () => { throw new DOMException("Blocked", "SecurityError"); }; });
  await page.getByRole("button", { name: "모든 로컬 기록 삭제", exact: true }).click();
  await page.getByRole("button", { name: "확인하고 모든 로컬 기록 삭제", exact: true }).click();
  await expect(page.getByText("현재 화면의 기록은 지웠지만 브라우저 저장소의 삭제 여부를 확인하지 못했어요.", { exact: false })).toBeVisible();
  await expect(page.getByText("이 탭의 프로필·검사·대화와 궁합 예시 기록을 모두 지웠어요.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "익명 게스트님의 공간" })).toBeVisible();
});
