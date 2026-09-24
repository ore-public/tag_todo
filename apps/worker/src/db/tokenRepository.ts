import type { ApiToken } from "@tag-todo/shared";
import { NOW_SQL } from "./sql";

interface TokenRow {
  id: number;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

function toApiToken(row: TokenRow): ApiToken {
  return { id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at };
}

export async function insertToken(db: D1Database, userId: number, name: string, tokenHash: string): Promise<ApiToken> {
  const row = await db
    .prepare(
      "INSERT INTO api_tokens (user_id, name, token_hash) VALUES (?, ?, ?) RETURNING id, name, created_at, last_used_at",
    )
    .bind(userId, name, tokenHash)
    .first<TokenRow>();
  if (!row) throw new Error("トークンの保存に失敗しました");
  return toApiToken(row);
}

export async function listActiveTokens(db: D1Database, userId: number): Promise<ApiToken[]> {
  const { results } = await db
    .prepare(
      "SELECT id, name, created_at, last_used_at FROM api_tokens WHERE user_id = ? AND revoked_at IS NULL ORDER BY id",
    )
    .bind(userId)
    .all<TokenRow>();
  return results.map(toApiToken);
}

export async function revokeToken(db: D1Database, userId: number, id: number): Promise<boolean> {
  const result = await db
    .prepare(`UPDATE api_tokens SET revoked_at = ${NOW_SQL} WHERE user_id = ? AND id = ? AND revoked_at IS NULL`)
    .bind(userId, id)
    .run();
  return result.meta.changes > 0;
}

/** 有効なトークンなら所有ユーザーの id を返し、最終利用日時を更新する */
export async function useActiveToken(db: D1Database, tokenHash: string): Promise<number | null> {
  const row = await db
    .prepare(
      `UPDATE api_tokens SET last_used_at = ${NOW_SQL}
       WHERE token_hash = ? AND revoked_at IS NULL RETURNING user_id`,
    )
    .bind(tokenHash)
    .first<{ user_id: number }>();
  return row?.user_id ?? null;
}
