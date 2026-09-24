import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quickAdd";

const today = "2026-09-25";

describe("parseQuickAdd", () => {
  it("タイトルだけ", () => {
    expect(parseQuickAdd("  牛乳を買う ", today)).toEqual({ title: "牛乳を買う" });
  });

  it("タグ・実施日・期限を指定できる", () => {
    expect(parseQuickAdd("資料 作成 #仕事 #急ぎ @tomorrow !2026-10-01", today)).toEqual({
      title: "資料 作成",
      tags: ["仕事", "急ぎ"],
      doDate: "2026-09-26",
      dueDate: "2026-10-01",
    });
  });

  it("記号だけの単語はタイトルの一部として扱う", () => {
    expect(parseQuickAdd("a # @ !", today)).toEqual({ title: "a # @ !" });
  });

  it("タイトルがなければエラー", () => {
    expect(() => parseQuickAdd("#仕事 @today", today)).toThrow("タイトルを入力してください");
  });

  it("日付が解釈できなければエラー", () => {
    expect(() => parseQuickAdd("a @someday", today)).toThrow("日付として解釈できません");
  });
});
