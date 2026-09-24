import { dayOfWeek, type Tag, type Todo } from "@tag-todo/shared";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(date: string): string {
  return `${date}(${WEEKDAYS[dayOfWeek(date)] ?? ""})`;
}

export function formatTodo(todo: Todo): string {
  const parts = [
    `#${String(todo.id)}`,
    todo.done ? "[x]" : "[ ]",
    todo.doDate === null ? "----------(-)" : formatDate(todo.doDate),
    todo.title,
    ...todo.tags.map((tag) => `#${tag}`),
  ];
  if (todo.dueDate !== null) parts.push(`(期限 ${formatDate(todo.dueDate)})`);
  return parts.join("  ");
}

export function formatTodoDetail(todo: Todo): string {
  return [formatTodo(todo), ...(todo.note === "" ? [] : ["", todo.note])].join("\n");
}

export function formatTodos(todos: Todo[]): string {
  return todos.length === 0 ? "todo はありません" : todos.map(formatTodo).join("\n");
}

export function formatTags(tags: Tag[]): string {
  return tags.length === 0
    ? "タグはありません"
    : tags.map((tag) => `#${tag.name}  (未完了 ${String(tag.openCount)} 件)`).join("\n");
}
