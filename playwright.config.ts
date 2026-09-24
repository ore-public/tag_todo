import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: "desktop.spec.ts" },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: "mobile.spec.ts" },
  ],
  // ビルドした SPA を、開発モード（Access の検証なし）の Worker で配信する
  webServer: {
    command: "pnpm --filter @tag-todo/web build && pnpm --filter @tag-todo/worker e2e:serve",
    url: `http://localhost:${String(PORT)}/api/me`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
