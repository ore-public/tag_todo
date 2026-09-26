import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    // API とログイン処理は、ローカルで起動した API サーバーに転送する
    proxy: { "/api": "http://localhost:8787", "/auth": "http://localhost:8787" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      // text: 端末に表示する。json-summary / json: CI でプルリクエストにコメントするために使う
      reporter: ["text", "json-summary", "json"],
      // カバレッジが下限を下回ってもレポートは出す
      reportOnFailure: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
