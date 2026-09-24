import { test as base } from "@playwright/test";

/**
 * テストごとに別のユーザーとして操作し、データが混ざらないようにする。
 * 開発モードの Worker は X-Dev-User-Email ヘッダーのユーザーとして扱う。
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.setExtraHTTPHeaders({ "X-Dev-User-Email": `e2e-${crypto.randomUUID()}@example.com` });
    await use(page);
  },
});

export { expect } from "@playwright/test";
