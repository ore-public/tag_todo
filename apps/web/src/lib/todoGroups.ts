import { dayOfWeek, diffDays, type Todo } from "@tag-todo/shared";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export interface TodoGroup {
  /** 実施日。未設定のグループは null */
  date: string | null;
  label: string;
  isPast: boolean;
  todos: Todo[];
}

export function formatShortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${String(Number(month))}/${String(Number(day))}(${WEEKDAYS[dayOfWeek(date)] ?? ""})`;
}

export function formatDateLabel(date: string, today: string): string {
  const relative = { [-1]: "昨日", 0: "今日", 1: "明日" }[diffDays(today, date)];
  return relative === undefined ? formatShortDate(date) : `${relative} ${formatShortDate(date)}`;
}

/** 実施日ごとにまとめる。実施日の昇順で、未設定は最後 */
export function groupTodos(todos: Todo[], today: string): TodoGroup[] {
  const byDate = new Map<string | null, Todo[]>();
  for (const todo of todos) {
    byDate.set(todo.doDate, [...(byDate.get(todo.doDate) ?? []), todo]);
  }
  const dates = [...byDate.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });
  return dates.map((date) => ({
    date,
    label: date === null ? "実施日なし" : formatDateLabel(date, today),
    isPast: date !== null && date < today,
    todos: (byDate.get(date) ?? []).toSorted((a, b) => a.id - b.id),
  }));
}

export type DueStatus = "overdue" | "soon" | "later";

/** 期限切れ、期限間近（2日以内）、それ以降のどれか。期限なしや完了済みは null */
export function dueStatus(todo: Todo, today: string): DueStatus | null {
  if (todo.dueDate === null || todo.done) return null;
  const days = diffDays(today, todo.dueDate);
  if (days < 0) return "overdue";
  if (days <= 2) return "soon";
  return "later";
}
