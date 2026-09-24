import type { Todo } from "@tag-todo/shared";
import type { TodoGroup } from "../lib/todoGroups";
import { TodoItem } from "./TodoItem";

interface Props {
  groups: TodoGroup[];
  today: string;
  selectedId: number | null;
  onSelect: (todo: Todo) => void;
  onToggleDone: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
}

export function TodoList({ groups, today, selectedId, onSelect, onToggleDone, onEdit }: Readonly<Props>) {
  if (groups.length === 0) return <p className="empty">todo はありません</p>;
  return (
    <div className="todo-list">
      {groups.map((group) => (
        <section key={group.date ?? "none"} aria-label={group.label}>
          <h2 className={`group-label${group.isPast ? " past" : ""}`}>{group.label}</h2>
          <ul>
            {group.todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                today={today}
                selected={todo.id === selectedId}
                onSelect={() => {
                  onSelect(todo);
                }}
                onToggleDone={() => {
                  onToggleDone(todo);
                }}
                onEdit={() => {
                  onEdit(todo);
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
