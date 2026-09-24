/**
 * 日付は "YYYY-MM-DD" 形式の文字列で扱う。
 * タイムゾーンの影響を受けないよう、計算は UTC の Date で行う。
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RELATIVE_PATTERN = /^([+-])(\d+)([dw])$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isValidDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y ?? 0, (m ?? 0) - 1, d ?? 0));
  return date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
}

function toUtcDate(value: string): Date {
  if (!isValidDate(value)) throw new Error(`不正な日付です: ${value}`);
  return new Date(`${value}T00:00:00Z`);
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return formatUtcDate(new Date(toUtcDate(value).getTime() + days * MS_PER_DAY));
}

/** a から b までの日数（b が後なら正） */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / MS_PER_DAY);
}

/** 実行環境のローカルタイムゾーンでの今日 */
export function localToday(now: Date = new Date()): string {
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 0 = 日曜日 */
export function dayOfWeek(value: string): number {
  return toUtcDate(value).getUTCDay();
}

/**
 * CLI などで入力された日付を解釈する。
 * 受け付ける形式: YYYY-MM-DD / today / tomorrow / yesterday / +3d / -2d / +1w
 */
export function parseDateInput(input: string, today: string): string {
  const value = input.trim().toLowerCase();
  if (value === "today") return today;
  if (value === "tomorrow") return addDays(today, 1);
  if (value === "yesterday") return addDays(today, -1);

  const relative = RELATIVE_PATTERN.exec(value);
  if (relative) {
    const [, sign, amount, unit] = relative;
    const days = Number(amount) * (unit === "w" ? 7 : 1);
    return addDays(today, sign === "-" ? -days : days);
  }

  if (isValidDate(value)) return value;
  throw new Error(`日付として解釈できません: ${input}`);
}
