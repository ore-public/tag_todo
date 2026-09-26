import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // テスト用のデータベースを作り直し、マイグレーションを適用する
    globalSetup: ["./test/globalSetup.ts"],
    // 意図してエラーを起こすテストがあるため、ログは出さない
    env: { POWERTOOLS_LOG_LEVEL: "SILENT" },
    coverage: {
      // text: 端末に表示する。json-summary / json: CI でプルリクエストにコメントするために使う
      reporter: ["text", "json-summary", "json"],
      // カバレッジが下限を下回ってもレポートは出す
      reportOnFailure: true,
      include: ["src/**/*.ts"],
      // 本番の入口と、ローカル開発用のサーバーは E2E テストと動作確認で確かめる。DB の型定義は自動生成
      exclude: ["src/lambda.ts", "src/server.ts", "src/db/schema.ts"],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
