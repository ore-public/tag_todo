import { parseDateInput, type TodoCreate } from "@tag-todo/shared";

const FIELD_BY_MARKER = { "#": "tags", "@": "doDate", "!": "dueDate" } as const;

function isMarker(value: string): value is keyof typeof FIELD_BY_MARKER {
  return value in FIELD_BY_MARKER;
}

/**
 * 1行の入力から todo を作る。
 * 例: "資料作成 #仕事 @tomorrow !2026-10-01"
 *   #タグ（複数可） / @実施日 / !期限。日付は today, +3d なども使える
 */
export function parseQuickAdd(text: string, today: string): TodoCreate {
  const tags: string[] = [];
  const words: string[] = [];
  const dates: { doDate?: string; dueDate?: string } = {};
  for (const word of text.trim().split(/\s+/)) {
    const [marker, value] = [word.slice(0, 1), word.slice(1)];
    if (!isMarker(marker) || value === "") {
      words.push(word);
      continue;
    }
    const field = FIELD_BY_MARKER[marker];
    if (field === "tags") tags.push(value);
    else dates[field] = parseDateInput(value, today);
  }
  const title = words.join(" ");
  if (!title) throw new Error("タイトルを入力してください");
  return { title, ...(tags.length > 0 && { tags }), ...dates };
}
