import type { ApiToken } from "@tag-todo/shared";
import { sql, type Selectable } from "kysely";
import type { Database } from "./connection";
import type { ApiTokens } from "./schema";

/** API トークンと、カレンダーのフィード用トークンは同じ列を持つ */
export type TokenTable = "api_tokens" | "calendar_feeds";

const TOKEN_COLUMNS = ["id", "name", "created_at", "last_used_at"] as const;

function toApiToken(row: Pick<Selectable<ApiTokens>, (typeof TOKEN_COLUMNS)[number]>): ApiToken {
  return { id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at };
}

export async function insertToken(
  db: Database,
  table: TokenTable,
  userId: number,
  token: { name: string; tokenHash: string },
): Promise<ApiToken> {
  const row = await db
    .insertInto(table)
    .values({ user_id: userId, name: token.name, token_hash: token.tokenHash })
    .returning(TOKEN_COLUMNS)
    .executeTakeFirstOrThrow();
  return toApiToken(row);
}

export async function listActiveTokens(db: Database, table: TokenTable, userId: number): Promise<ApiToken[]> {
  const rows = await db
    .selectFrom(table)
    .select(TOKEN_COLUMNS)
    .where("user_id", "=", userId)
    .where("revoked_at", "is", null)
    .orderBy("id")
    .execute();
  return rows.map(toApiToken);
}

export async function revokeToken(db: Database, table: TokenTable, userId: number, id: number): Promise<boolean> {
  const result = await db
    .updateTable(table)
    .set({ revoked_at: sql<string>`now()` })
    .where("user_id", "=", userId)
    .where("id", "=", id)
    .where("revoked_at", "is", null)
    .executeTakeFirst();
  return result.numUpdatedRows > 0n;
}

/** 有効なトークンなら所有ユーザーの id を返し、最終利用日時を更新する */
export async function useActiveToken(db: Database, table: TokenTable, tokenHash: string): Promise<number | null> {
  const row = await db
    .updateTable(table)
    .set({ last_used_at: sql<string>`now()` })
    .where("token_hash", "=", tokenHash)
    .where("revoked_at", "is", null)
    .returning("user_id")
    .executeTakeFirst();
  return row?.user_id ?? null;
}
