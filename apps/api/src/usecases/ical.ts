import { addDays, type Todo } from "@tag-todo/shared";

/** 1 行の上限（改行を除く）。超える行は折り返す（RFC 5545 3.1） */
const MAX_LINE_OCTETS = 75;

/** TEXT 型の値で特別な意味を持つ文字をエスケープする（RFC 5545 3.3.11） */
function escapeText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll(/\r?\n/g, "\\n");
}

/** UTF-8 で 75 バイトを超える行を、文字の途中で切らずに折り返す。続きの行は空白で始める */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // 続きの行は先頭の空白の分だけ短くする
    const limit = lines.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      lines.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  lines.push(current);
  return lines.join("\r\n ");
}

/** "2026-09-27" → "20260927" */
function toIcalDate(date: string): string {
  return date.replaceAll("-", "");
}

/** UTC の日時 "20260927T123456Z" */
function toIcalDateTime(date: Date): string {
  return date
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function description(todo: Todo): string {
  const lines: string[] = [];
  if (todo.note !== "") lines.push(todo.note);
  if (todo.tags.length > 0) lines.push("タグ: " + todo.tags.map((tag) => `#${tag}`).join(" "));
  if (todo.doDate !== null && todo.dueDate !== null) lines.push(`期限: ${todo.dueDate}`);
  return lines.join("\n");
}

/** 実施日があれば実施日、なければ期限日の終日の予定にする。どちらもなければ予定にしない */
function toEvent(todo: Todo, stamp: string): string[] {
  const date = todo.doDate ?? todo.dueDate;
  if (date === null) return [];
  const summary = todo.doDate === null ? `期限: ${todo.title}` : todo.title;
  const body = description(todo);
  return [
    "BEGIN:VEVENT",
    `UID:todo-${String(todo.id)}@tag-todo`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toIcalDate(date)}`,
    `DTEND;VALUE=DATE:${toIcalDate(addDays(date, 1))}`,
    `SUMMARY:${escapeText(summary)}`,
    ...(body === "" ? [] : [`DESCRIPTION:${escapeText(body)}`]),
    // 予定の時間帯を「予定あり」として扱わない
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ];
}

/** todo を iCalendar 形式（VEVENT の終日の予定）にする */
export function toICalendar(todos: Todo[], now: Date): string {
  const stamp = toIcalDateTime(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tag todo//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:tag todo",
    ...todos.flatMap((todo) => toEvent(todo, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
