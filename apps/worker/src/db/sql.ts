/** SQL 内で現在時刻を ISO 8601 形式で得る式 */
export const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}
