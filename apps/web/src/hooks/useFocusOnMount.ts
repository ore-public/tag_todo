import { useEffect, useRef } from "react";

/**
 * 表示したときに要素にフォーカスを移す。キーボードだけで続けて操作できるようにするため。
 * 文字の入力欄では、続けて入力できるようにカーソルを末尾に置く。
 */
export function useFocusOnMount<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    element.focus();
    if (element instanceof HTMLInputElement && element.type === "text") {
      element.setSelectionRange(element.value.length, element.value.length);
    }
  }, [enabled]);
  return ref;
}
