import { useState } from "react";

/**
 * 一覧で選択中の todo を管理する。
 * 選択中の todo が一覧から消えたとき（完了して非表示になったときなど）は、同じ位置の todo を選択する。
 */
export function useTodoCursor(ids: number[]) {
  const [cursor, setCursor] = useState<{ id: number | null; index: number }>({ id: null, index: 0 });

  const foundIndex = cursor.id === null ? -1 : ids.indexOf(cursor.id);
  const index = foundIndex >= 0 ? foundIndex : Math.min(cursor.index, ids.length - 1);
  const selectedId = ids[index] ?? null;

  const selectIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(next, ids.length - 1));
    setCursor({ id: ids[clamped] ?? null, index: clamped });
  };

  return {
    selectedId,
    select: (id: number) => {
      selectIndex(ids.indexOf(id));
    },
    move: (delta: number) => {
      selectIndex(index + delta);
    },
    moveToFirst: () => {
      selectIndex(0);
    },
    moveToLast: () => {
      selectIndex(ids.length - 1);
    },
  };
}
