import type { ApiToken } from "@tag-todo/shared";
import { sql, type Selectable } from "kysely";
import type { Database } from "./connection";
import type { ApiTokens } from "./schema";

const TOKEN_COLUMNS = ["id", "name", "created_at", "last_used_at"] as const;

function toApiToken(row: Pick<Selectable<ApiTokens>, (typeof TOKEN_COLUMNS)[number]>): ApiToken {
  return { id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at };
}

export async function insertToken(db: Database, userId: number, name: string, tokenHash: string): Promise<ApiToken> {
  const row = await db
    .insertInto("api_tokens")
    .values({ user_id: userId, name, token_hash: tokenHash })
    .returning(TOKEN_COLUMNS)
    .executeTakeFirstOrThrow();
  return toApiToken(row);
}

export async function listActiveTokens(db: Database, userId: number): Promise<ApiToken[]> {
  const rows = await db
    .selectFrom("api_tokens")
    .select(TOKEN_COLUMNS)
    .where("user_id", "=", userId)
    .where("revoked_at", "is", null)
    .orderBy("id")
    .execute();
  return rows.map(toApiToken);
}

export async function revokeToken(db: Database, userId: number, id: number): Promise<boolean> {
  const result = await db
    .updateTable("api_tokens")
    .set({ revoked_at: sql<string>`now()` })
    .where("user_id", "=", userId)
    .where("id", "=", id)
    .where("revoked_at", "is", null)
    .executeTakeFirst();
  return result.numUpdatedRows > 0n;
}

/** 有効なトークンなら所有ユーザーの id を返し、最終利用日時を更新する */
export async function useActiveToken(db: Database, tokenHash: string): Promise<number | null> {
  const row = await db
    .updateTable("api_tokens")
    .set({ last_used_at: sql<string>`now()` })
    .where("token_hash", "=", tokenHash)
    .where("revoked_at", "is", null)
    .returning("user_id")
    .executeTakeFirst();
  return row?.user_id ?? null;
}
