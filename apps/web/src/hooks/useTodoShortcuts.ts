import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

export interface TodoShortcutActions {
  move: (delta: number) => void;
  moveToFirst: () => void;
  moveToLast: () => void;
  shiftDoDate: (days: number) => void;
  toggleDone: () => void;
  edit: () => void;
  editTags: () => void;
  remove: () => void;
  focusQuickAdd: () => void;
  focusTagFilter: () => void;
  toggleShowDone: () => void;
  showHelp: () => void;
}

/** 一覧画面のキー割り当て。一覧は HelpDialog に書いている */
export function useTodoShortcuts(actions: TodoShortcutActions, enabled: boolean) {
  useKeyboardShortcuts(
    {
      j: () => {
        actions.move(1);
      },
      k: () => {
        actions.move(-1);
      },
      ArrowDown: () => {
        actions.move(1);
      },
      ArrowUp: () => {
        actions.move(-1);
      },
      g: actions.moveToFirst,
      G: actions.moveToLast,
      "ctrl+j": () => {
        actions.shiftDoDate(1);
      },
      "ctrl+k": () => {
        actions.shiftDoDate(-1);
      },
      x: actions.toggleDone,
      e: actions.edit,
      Enter: actions.edit,
      t: actions.editTags,
      d: actions.remove,
      o: actions.focusQuickAdd,
      "/": actions.focusTagFilter,
      c: actions.toggleShowDone,
      "?": actions.showHelp,
    },
    enabled,
  );
}
