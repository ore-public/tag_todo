import { expect, test } from "./fixtures";

test("タップで追加・編集・完了ができる", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("todo を追加").fill("スマホの todo @today");
  await page.getByRole("button", { name: "追加" }).tap();
  await expect(page.getByRole("region", { name: /^今日/ })).toContainText("スマホの todo");

  await page.getByRole("button", { name: "スマホの todo" }).tap();
  await page.getByRole("button", { name: "実施日を1日後にする" }).tap();
  await page.getByRole("button", { name: "保存" }).tap();
  await expect(page.getByRole("region", { name: /^明日/ })).toContainText("スマホの todo");

  await page.getByLabel("「スマホの todo」を完了にする").tap();
  await expect(page.getByText("todo はありません")).toBeVisible();
});

test("画面の幅に収まり、横にスクロールしない", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("todo を追加").fill("とても長いタイトルの todo ".repeat(10) + " #タグ1 #タグ2 !+1d");
  await page.getByRole("button", { name: "追加" }).tap();
  await expect(page.getByText("#タグ1", { exact: true })).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalScroll).toBe(false);
});
