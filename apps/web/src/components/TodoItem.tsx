import type { Todo } from "@tag-todo/shared";
import { dueStatus, formatShortDate } from "../lib/todoGroups";

interface Props {
  todo: Todo;
  today: string;
  selected: boolean;
  onSelect: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
}

const DUE_LABEL = { overdue: "期限切れ", soon: "期限間近", later: "期限" } as const;

export function TodoItem({ todo, today, selected, onSelect, onToggleDone, onEdit }: Readonly<Props>) {
  const due = dueStatus(todo, today);
  return (
    <li
      id={`todo-${String(todo.id)}`}
      className={`todo-item${selected ? " selected" : ""}${todo.done ? " done" : ""}`}
      aria-current={selected ? "true" : undefined}
    >
      <input
        type="checkbox"
        aria-label={`「${todo.title}」を完了にする`}
        checked={todo.done}
        onChange={() => {
          onSelect();
          onToggleDone();
        }}
      />
      <button
        type="button"
        className="todo-title"
        onClick={() => {
          onSelect();
          onEdit();
        }}
      >
        {todo.title}
      </button>
      <span className="todo-meta">
        {todo.tags.map((tag) => (
          <span key={tag} className="tag">
            #{tag}
          </span>
        ))}
        {todo.dueDate !== null && (
          <span className={`due due-${due ?? "done"}`}>
            {DUE_LABEL[due ?? "later"]} {formatShortDate(todo.dueDate)}
          </span>
        )}
      </span>
    </li>
  );
}
