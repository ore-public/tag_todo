import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("todo はありません")).toBeVisible();
});

async function addTodo(page: Page, text: string) {
  await page.keyboard.press("o");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
}

test("キーボードだけで追加・移動・実施日の変更・完了ができる", async ({ page }) => {
  await addTodo(page, "一つ目 #仕事 @today");
  await expect(page.getByRole("button", { name: "一つ目" })).toBeVisible();
  await addTodo(page, "二つ目 @today !+1d");
  await expect(page.getByRole("button", { name: "二つ目" })).toBeVisible();

  const today = page.getByRole("region", { name: /^今日/ });
  await expect(today).toContainText("一つ目");
  await expect(today).toContainText("二つ目");
  await expect(today.getByText("#仕事")).toBeVisible();
  await expect(today.getByText(/期限間近/)).toBeVisible();

  const selected = page.locator('[aria-current="true"]');
  await expect(selected).toContainText("一つ目");
  await page.keyboard.press("j");
  await expect(selected).toContainText("二つ目");

  // Ctrl+j で明日に移動し、選択は二つ目のまま
  await page.keyboard.press("Control+j");
  await expect(page.getByRole("region", { name: /^明日/ })).toContainText("二つ目");
  await expect(selected).toContainText("二つ目");

  // 再読み込みしてもサーバーに保存されている
  await page.reload();
  await expect(page.getByRole("region", { name: /^明日/ })).toContainText("二つ目");

  // 再読み込み後はカーソルが先頭（一つ目）に戻る
  await expect(selected).toContainText("一つ目");
  await page.keyboard.press("x");
  await expect(page.getByRole("button", { name: "一つ目" })).toBeHidden();
  await expect(selected).toContainText("二つ目");
});

test("タグで絞り込み、編集・削除ができる", async ({ page }) => {
  await addTodo(page, "仕事の todo #仕事");
  await addTodo(page, "家の todo #家");
  await expect(page.getByRole("button", { name: "家の todo" })).toBeVisible();

  await page.keyboard.press("/");
  await page.getByLabel("タグで絞り込み").selectOption("家");
  await expect(page.getByRole("button", { name: "仕事の todo" })).toBeHidden();
  await page.keyboard.press("Escape");

  await page.keyboard.press("t");
  await page.keyboard.type(" 急ぎ");
  await page.keyboard.press("Enter");
  await expect(page.getByText("#急ぎ", { exact: true })).toBeVisible();

  await page.keyboard.press("d");
  await expect(page.getByRole("dialog", { name: "todo の削除" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("todo はありません")).toBeVisible();
});

test("API トークンを発行すると、そのトークンで外部クライアント用 API を使える", async ({ page, request }) => {
  await page.getByRole("link", { name: "連携設定" }).click();
  const section = page.getByRole("region", { name: "API トークン" });
  await section.getByLabel("トークンの名前").fill("E2E");
  await section.getByRole("button", { name: "発行" }).click();
  const token = await section.locator(".issued-token code").first().textContent();
  expect(token).toMatch(/^tagtodo_/);

  const res = await request.post("/api/v1/todos", {
    headers: { Authorization: `Bearer ${token ?? ""}` },
    data: { title: "CLI から追加", tags: ["cli"] },
  });
  expect(res.status()).toBe(201);

  await page.getByRole("link", { name: "todo" }).click();
  await expect(page.getByRole("button", { name: "CLI から追加" })).toBeVisible();
});

test("カレンダーのフィード URL を発行すると、その URL で todo を iCal 形式で取得できる", async ({ page, request }) => {
  await addTodo(page, "カレンダーに出す @today");
  await expect(page.getByRole("button", { name: "カレンダーに出す" })).toBeVisible();

  await page.getByRole("link", { name: "連携設定" }).click();
  const section = page.getByRole("region", { name: "カレンダー連携" });
  await section.getByLabel("フィードの名前").fill("E2E");
  await section.getByRole("button", { name: "発行" }).click();
  const url = await section.locator(".issued-token code").first().textContent();
  expect(url).toMatch(/\/ical\/tagtodocal_.+\.ics$/);

  const res = await request.get(url ?? "");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("SUMMARY:カレンダーに出す");
});
