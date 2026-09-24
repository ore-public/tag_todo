import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
          DEV_USER_EMAIL: "dev@example.com",
          CORS_ORIGINS: "https://app.example.com",
        },
      },
    })),
  ],
  test: {
    setupFiles: ["./test/applyMigrations.ts"],
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
