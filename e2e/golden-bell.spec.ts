import { expect, test } from "@playwright/test";
import { sampleQuizSet } from "../src/features/import/sampleQuiz";

test("단일 화면은 키보드와 클릭으로 앞뒤 진행된다", async ({ page }) => {
  await page.goto("/");

  await page.locator(".grid--two > section:last-child .controls-row button").nth(1).click();
  await expect(page.getByText(sampleQuizSet.title).first()).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.getByText("다 같이 집중해 주세요.")).toBeVisible();

  await page.keyboard.press("Space");
  await expect(page.getByText(sampleQuizSet.questions[0].prompt)).toBeVisible();

  await page.locator("main.screen-shell").click({ position: { x: 200, y: 200 } });
  await expect(page.getByText("자신의 삶")).toBeVisible();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByText(sampleQuizSet.questions[1].prompt)).toBeVisible();

  await page.keyboard.press("ArrowUp");
  await expect(page.getByText("자신의 삶")).toBeVisible();
});

test("호스트 조작은 발표 화면에 즉시 반영된다", async ({ browser }) => {
  const context = await browser.newContext();
  const hostPage = await context.newPage();

  await hostPage.goto("/");
  await hostPage.locator(".grid--two > section:last-child .controls-row button").first().click();
  await expect(hostPage.locator(".hero .controls-row button").first()).toBeVisible();

  const screenUrl = await hostPage.locator(".split-note span").textContent();

  if (!screenUrl) {
    throw new Error("발표 화면 주소를 읽지 못했습니다.");
  }

  const screenPage = await context.newPage();
  await screenPage.goto(screenUrl);
  await expect(screenPage.getByText(sampleQuizSet.title).first()).toBeVisible();

  await hostPage.locator(".stage-actions button").first().click();
  await expect(screenPage.getByText("다 같이 집중해 주세요.")).toBeVisible();

  await hostPage.locator(".stage-actions button").first().click();
  await expect(screenPage.getByText(sampleQuizSet.questions[0].prompt)).toBeVisible();

  await hostPage.locator(".stage-actions button").first().click();
  await expect(screenPage.getByText("자신의 삶")).toBeVisible();

  await hostPage.locator(".stage-actions button").first().click();
  await hostPage.locator(".stage-actions button").nth(2).click();
  await expect(screenPage.getByText(sampleQuizSet.questions[1].prompt)).toBeVisible();

  await context.close();
});
