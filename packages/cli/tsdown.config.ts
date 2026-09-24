import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node20",
  // 共有パッケージと zod は npm に公開しないため、CLI に含める
  deps: {
    alwaysBundle: ["@tag-todo/shared", "zod"],
    onlyBundle: ["@tag-todo/shared", "zod"],
  },
});
