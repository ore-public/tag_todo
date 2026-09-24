import { useEffect, useEffectEvent } from "react";
import { isEditableTarget, shortcutKey } from "../lib/keyboard";

export type ShortcutHandlers = Partial<Record<string, () => void>>;

/**
 * キー（"j", "ctrl+j", "?" など）に対応する処理を登録する。
 * 文字入力中と、enabled が false のときは何もしない。
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.altKey || isEditableTarget(event.target)) return;
    const handler = handlers[shortcutKey(event)];
    if (handler) {
      event.preventDefault();
      handler();
    }
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const listener = (event: KeyboardEvent) => {
      onKeyDown(event);
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [enabled]);
}
