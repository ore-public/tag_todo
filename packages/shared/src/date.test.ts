import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, diffDays, isValidDate, localToday, parseDateInput } from "./date";

describe("isValidDate", () => {
  it.each([
    ["2026-09-25", true],
    ["2024-02-29", true],
    ["2026-02-29", false],
    ["2026-13-01", false],
    ["2026-9-25", false],
    ["abc", false],
  ])("%s は %s", (value, expected) => {
    expect(isValidDate(value)).toBe(expected);
  });
});

describe("addDays", () => {
  it("月をまたいで加算できる", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("年をまたいで減算できる", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("不正な日付はエラー", () => {
    expect(() => addDays("2026-02-30", 1)).toThrow("不正な日付です");
  });
});

describe("diffDays", () => {
  it("後の日付なら正の日数", () => {
    expect(diffDays("2026-09-25", "2026-10-02")).toBe(7);
  });

  it("前の日付なら負の日数", () => {
    expect(diffDays("2026-09-25", "2026-09-24")).toBe(-1);
  });
});

describe("localToday", () => {
  it("ローカル時刻の日付を返す", () => {
    expect(localToday(new Date(2026, 8, 5, 23, 59))).toBe("2026-09-05");
  });
});

describe("dayOfWeek", () => {
  it("2026-09-25 は金曜日", () => {
    expect(dayOfWeek("2026-09-25")).toBe(5);
  });
});

describe("parseDateInput", () => {
  const today = "2026-09-25";

  it.each([
    ["today", "2026-09-25"],
    ["tomorrow", "2026-09-26"],
    ["yesterday", "2026-09-24"],
    ["+3d", "2026-09-28"],
    ["-2d", "2026-09-23"],
    ["+1w", "2026-10-02"],
    [" Today ", "2026-09-25"],
    ["2026-12-31", "2026-12-31"],
  ])("%s → %s", (input, expected) => {
    expect(parseDateInput(input, today)).toBe(expected);
  });

  it.each(["next week", "3d", "2026-02-30"])("%s はエラー", (input) => {
    expect(() => parseDateInput(input, today)).toThrow("日付として解釈できません");
  });
});
