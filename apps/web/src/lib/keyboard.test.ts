import { describe, expect, it } from "vitest";
import { isEditableTarget, shortcutKey } from "./keyboard";

describe("shortcutKey", () => {
  it.each([
    [{ key: "j" }, "j"],
    [{ key: "J", shiftKey: true }, "J"],
    [{ key: "j", ctrlKey: true }, "ctrl+j"],
    [{ key: "?", shiftKey: true }, "?"],
    [{ key: "Enter" }, "Enter"],
  ])("%o → %s", (init, expected) => {
    expect(shortcutKey(new KeyboardEvent("keydown", init))).toBe(expected);
  });
});

describe("isEditableTarget", () => {
  it.each([
    ["input", true],
    ["textarea", true],
    ["select", true],
    ["button", false],
    ["div", false],
  ])("%s → %s", (tag, expected) => {
    expect(isEditableTarget(document.createElement(tag))).toBe(expected);
  });

  it("要素以外は false", () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});
