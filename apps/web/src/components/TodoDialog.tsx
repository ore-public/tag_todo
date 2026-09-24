import type { Todo, TodoUpdate } from "@tag-todo/shared";
import { ConfirmDialog } from "./ConfirmDialog";
import { HelpDialog } from "./HelpDialog";
import { TodoEditor, type EditorFocus } from "./TodoEditor";

export type TodoDialogState =
  { kind: "edit"; todo: Todo; focus: EditorFocus } | { kind: "delete"; todo: Todo } | { kind: "help" };

interface Props {
  dialog: TodoDialogState;
  today: string;
  onClose: () => void;
  onSave: (todo: Todo, input: TodoUpdate) => void;
  onDelete: (todo: Todo) => void;
}

/** 一覧画面で開くダイアログ（編集・削除の確認・ヘルプ） */
export function TodoDialog({ dialog, today, onClose, onSave, onDelete }: Readonly<Props>) {
  switch (dialog.kind) {
    case "edit":
      return (
        <TodoEditor
          todo={dialog.todo}
          today={today}
          focus={dialog.focus}
          onClose={onClose}
          onSave={(input) => {
            onSave(dialog.todo, input);
            onClose();
          }}
        />
      );
    case "delete":
      return (
        <ConfirmDialog
          title="todo の削除"
          message={`「${dialog.todo.title}」を削除します。`}
          confirmLabel="削除"
          onCancel={onClose}
          onConfirm={() => {
            onDelete(dialog.todo);
            onClose();
          }}
        />
      );
    case "help":
      return <HelpDialog onClose={onClose} />;
  }
}
