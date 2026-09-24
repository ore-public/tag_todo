import { addDays, type Todo } from "@tag-todo/shared";
import { useEffect, useRef, useState } from "react";
import { useTags } from "../hooks/useTags";
import { useTodoCursor } from "../hooks/useTodoCursor";
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from "../hooks/useTodos";
import { useTodoShortcuts } from "../hooks/useTodoShortcuts";
import { groupTodos } from "../lib/todoGroups";
import { ErrorMessage } from "./ErrorMessage";
import { QuickAdd } from "./QuickAdd";
import { TodoDialog, type TodoDialogState } from "./TodoDialog";
import { TodoFilters } from "./TodoFilters";
import { TodoList } from "./TodoList";

interface Props {
  today: string;
  helpRequested: boolean;
  onHelpClosed: () => void;
}

export function TodoPage({ today, helpRequested, onHelpClosed }: Readonly<Props>) {
  const [showDone, setShowDone] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>();
  const [dialog, setDialog] = useState<TodoDialogState | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const tagFilterRef = useRef<HTMLSelectElement>(null);

  const todosQuery = useTodos({ status: showDone ? "all" : "open", tag: tagFilter });
  const tagsQuery = useTags();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const groups = groupTodos(todosQuery.data ?? [], today);
  const todos = groups.flatMap((group) => group.todos);
  const cursor = useTodoCursor(todos.map((todo) => todo.id));
  const selected = todos.find((todo) => todo.id === cursor.selectedId);
  const currentDialog: TodoDialogState | null = helpRequested ? { kind: "help" } : dialog;

  useEffect(() => {
    if (cursor.selectedId !== null) {
      document.getElementById(`todo-${String(cursor.selectedId)}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [cursor.selectedId]);

  const closeDialog = () => {
    setDialog(null);
    onHelpClosed();
  };
  const toggleDone = (todo: Todo) => {
    updateTodo.mutate({ id: todo.id, input: { done: !todo.done } });
  };
  /** 選択中の todo に対する操作。選択中の todo がなければ何もしない */
  const withSelected = (action: (todo: Todo) => void) => () => {
    if (selected) action(selected);
  };

  useTodoShortcuts(
    {
      move: cursor.move,
      moveToFirst: cursor.moveToFirst,
      moveToLast: cursor.moveToLast,
      shiftDoDate: (days) => {
        if (!selected) return;
        // 並び順が変わっても同じ todo を選択し続けるよう、id で選択し直す
        cursor.select(selected.id);
        const doDate = selected.doDate === null ? today : addDays(selected.doDate, days);
        updateTodo.mutate({ id: selected.id, input: { doDate } });
      },
      toggleDone: withSelected(toggleDone),
      edit: withSelected((todo) => {
        setDialog({ kind: "edit", todo, focus: "title" });
      }),
      editTags: withSelected((todo) => {
        setDialog({ kind: "edit", todo, focus: "tags" });
      }),
      remove: withSelected((todo) => {
        setDialog({ kind: "delete", todo });
      }),
      focusQuickAdd: () => quickAddRef.current?.focus(),
      focusTagFilter: () => tagFilterRef.current?.focus(),
      toggleShowDone: () => {
        setShowDone((value) => !value);
      },
      showHelp: () => {
        setDialog({ kind: "help" });
      },
    },
    currentDialog === null,
  );

  const error = [todosQuery, createTodo, updateTodo, deleteTodo].map((result) => result.error).find(Boolean);

  return (
    <main>
      <div className="toolbar">
        <QuickAdd
          today={today}
          inputRef={quickAddRef}
          onAdd={(input) => {
            createTodo.mutate(input);
          }}
        />
        <TodoFilters
          tags={tagsQuery.data ?? []}
          tagFilter={tagFilter}
          showDone={showDone}
          selectRef={tagFilterRef}
          onTagFilterChange={setTagFilter}
          onShowDoneChange={setShowDone}
        />
      </div>
      {error && <ErrorMessage error={error} />}
      {todosQuery.isPending ? (
        <p className="empty">読み込み中…</p>
      ) : (
        <TodoList
          groups={groups}
          today={today}
          selectedId={cursor.selectedId}
          onSelect={(todo) => {
            cursor.select(todo.id);
          }}
          onToggleDone={toggleDone}
          onEdit={(todo) => {
            setDialog({ kind: "edit", todo, focus: "title" });
          }}
        />
      )}
      {currentDialog && (
        <TodoDialog
          dialog={currentDialog}
          today={today}
          onClose={closeDialog}
          onSave={(todo, input) => {
            updateTodo.mutate({ id: todo.id, input });
          }}
          onDelete={(todo) => {
            deleteTodo.mutate(todo.id);
          }}
        />
      )}
    </main>
  );
}
