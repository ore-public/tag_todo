import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      // text: 端末に表示する。json-summary / json: CI でプルリクエストにコメントするために使う
      reporter: ["text", "json-summary", "json"],
      // カバレッジが下限を下回ってもレポートは出す
      reportOnFailure: true,
      include: ["src/**/*.ts"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
