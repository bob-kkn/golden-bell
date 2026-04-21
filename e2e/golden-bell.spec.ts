import { expect, test } from "@playwright/test";

test("단일 화면은 키보드와 클릭으로 앞뒤 진행된다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "단일 화면으로 시작" }).click();
  await expect(page.getByText("6학년 1반 3월 국어 골든벨").first()).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.getByText("다 같이 집중해 주세요")).toBeVisible();

  await page.keyboard.press("Space");
  await expect(page.getByText("(단원 제목) ___ 과 관련지어 읽어요.")).toBeVisible();

  await page.locator("main.screen-shell").click({ position: { x: 200, y: 200 } });
  await expect(page.getByText("자신의 삶")).toBeVisible();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByText("사람들이 자신의 삶에서 중요하게 여기는 것을 __ 라고 해요.")).toBeVisible();

  await page.keyboard.press("ArrowUp");
  await expect(page.getByText("자신의 삶")).toBeVisible();
});

test("호스트 조작은 발표 화면에 즉시 반영된다", async ({ browser }) => {
  const context = await browser.newContext();
  const hostPage = await context.newPage();

  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "분리 화면으로 시작" }).click();
  await expect(hostPage.getByRole("button", { name: "발표 화면 열기" })).toBeVisible();

  const screenUrl = await hostPage.locator(".split-note span").textContent();

  if (!screenUrl) {
    throw new Error("발표 화면 주소를 읽지 못했습니다.");
  }

  const screenPage = await context.newPage();
  await screenPage.goto(screenUrl);
  await expect(screenPage.getByText("6학년 1반 3월 국어 골든벨").first()).toBeVisible();

  await hostPage.getByRole("button", { name: "규칙 보기" }).click();
  await expect(screenPage.getByText("다 같이 집중해 주세요")).toBeVisible();

  await hostPage.getByRole("button", { name: "첫 문제 시작" }).click();
  await expect(screenPage.getByText("(단원 제목) ___ 과 관련지어 읽어요.")).toBeVisible();

  await hostPage.getByRole("button", { name: "정답 공개" }).click();
  await expect(screenPage.getByText("자신의 삶")).toBeVisible();

  await hostPage.getByRole("button", { name: "이번 문제 점수 반영" }).click();
  await hostPage.getByRole("button", { name: "다음 문제" }).click();
  await expect(screenPage.getByText("사람들이 자신의 삶에서 중요하게 여기는 것을 __ 라고 해요.")).toBeVisible();

  await context.close();
});
