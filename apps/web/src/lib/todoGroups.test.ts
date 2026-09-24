import type { Todo } from "@tag-todo/shared";
import { describe, expect, it } from "vitest";
import { dueStatus, formatDateLabel, groupTodos } from "./todoGroups";

function todo(fields: Partial<Todo> & { id: number }): Todo {
  return {
    title: `todo ${String(fields.id)}`,
    note: "",
    done: false,
    doDate: null,
    dueDate: null,
    tags: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    ...fields,
  };
}

const today = "2026-09-25";

describe("formatDateLabel", () => {
  it.each([
    ["2026-09-24", "昨日 9/24(木)"],
    ["2026-09-25", "今日 9/25(金)"],
    ["2026-09-26", "明日 9/26(土)"],
    ["2026-10-01", "10/1(木)"],
  ])("%s → %s", (date, expected) => {
    expect(formatDateLabel(date, today)).toBe(expected);
  });
});

describe("groupTodos", () => {
  it("実施日の昇順にまとめ、実施日なしは最後、同じ日の中は id 順", () => {
    const groups = groupTodos(
      [
        todo({ id: 1 }),
        todo({ id: 3, doDate: "2026-09-26" }),
        todo({ id: 2, doDate: "2026-09-26" }),
        todo({ id: 4, doDate: "2026-09-20" }),
      ],
      today,
    );

    expect(groups.map((group) => [group.label, group.isPast, group.todos.map((t) => t.id)])).toEqual([
      ["9/20(日)", true, [4]],
      ["明日 9/26(土)", false, [2, 3]],
      ["実施日なし", false, [1]],
    ]);
  });
});

describe("dueStatus", () => {
  it.each([
    ["2026-09-24", "overdue"],
    ["2026-09-25", "soon"],
    ["2026-09-27", "soon"],
    ["2026-09-28", "later"],
  ] as const)("期限 %s → %s", (dueDate, expected) => {
    expect(dueStatus(todo({ id: 1, dueDate }), today)).toBe(expected);
  });

  it("期限なしは null", () => {
    expect(dueStatus(todo({ id: 1 }), today)).toBeNull();
  });

  it("完了済みは期限切れでも null", () => {
    expect(dueStatus(todo({ id: 1, dueDate: "2026-09-01", done: true }), today)).toBeNull();
  });
});
