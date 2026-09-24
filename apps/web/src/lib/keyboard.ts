/** 文字入力中の要素ではショートカットを無効にする */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** "ctrl+j" のような形式に変換する */
export function shortcutKey(event: KeyboardEvent): string {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  // Shift で入力される "?" や "G" は、そのままの文字で扱う
  const shifted = event.shiftKey && event.key.length === 1 ? event.key : key;
  return event.ctrlKey ? `ctrl+${key}` : shifted;
}

/** 入力欄で Escape を押したら、入力欄から抜けて一覧のキーボード操作に戻る */
export function blurOnEscape(event: { key: string; currentTarget: { blur: () => void } }) {
  if (event.key === "Escape") event.currentTarget.blur();
}
