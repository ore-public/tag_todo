import type { Database } from "./connection";

/**
 * 認証基盤のユーザー ID（subject）に対応するユーザーの id を返す。
 * 存在しなければ作成し、メールアドレスが変わっていれば更新する。
 */
export async function findOrCreateUser(db: Database, subject: string, email: string): Promise<number> {
  const existing = await db
    .selectFrom("users")
    .select(["id", "email"])
    .where("subject", "=", subject)
    .executeTakeFirst();
  if (existing?.email === email) return existing.id;
  const { id } = await db
    .insertInto("users")
    .values({ subject, email })
    .onConflict((oc) => oc.column("subject").doUpdateSet({ email }))
    .returning("id")
    .executeTakeFirstOrThrow();
  return id;
}

export async function findUserEmail(db: Database, userId: number): Promise<string | null> {
  const row = await db.selectFrom("users").select("email").where("id", "=", userId).executeTakeFirst();
  return row?.email ?? null;
}
