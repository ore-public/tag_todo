import { describe, expect, it } from "vitest";
import { todoCreateSchema, todoListQuerySchema, todoUpdateSchema } from "./schemas";

describe("todoCreateSchema", () => {
  it("タイトルの前後の空白を除き、重複したタグをまとめる", () => {
    const result = todoCreateSchema.parse({ title: "  買い物 ", tags: ["家", "家", "急ぎ"] });
    expect(result).toEqual({ title: "買い物", tags: ["家", "急ぎ"] });
  });

  it("空のタイトルはエラー", () => {
    expect(todoCreateSchema.safeParse({ title: "  " }).success).toBe(false);
  });

  it("空白を含むタグ名はエラー", () => {
    expect(todoCreateSchema.safeParse({ title: "a", tags: ["a b"] }).success).toBe(false);
  });

  it("存在しない日付はエラー", () => {
    expect(todoCreateSchema.safeParse({ title: "a", doDate: "2026-02-30" }).success).toBe(false);
  });
});

describe("todoUpdateSchema", () => {
  it("実施日に null を指定して未設定に戻せる", () => {
    expect(todoUpdateSchema.parse({ doDate: null })).toEqual({ doDate: null });
  });

  it("何も指定しなくてもよい", () => {
    expect(todoUpdateSchema.parse({})).toEqual({});
  });
});

describe("todoListQuerySchema", () => {
  it("status を省略すると open", () => {
    expect(todoListQuerySchema.parse({})).toEqual({ status: "open" });
  });

  it("不正な status はエラー", () => {
    expect(todoListQuerySchema.safeParse({ status: "closed" }).success).toBe(false);
  });
});
