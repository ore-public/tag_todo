/** メールアドレスに対応するユーザーの id を返す。存在しなければ作成する */
export async function findOrCreateUser(db: D1Database, email: string): Promise<number> {
  const row = await db
    .prepare(
      "INSERT INTO users (email) VALUES (?) ON CONFLICT (email) DO UPDATE SET email = excluded.email RETURNING id",
    )
    .bind(email)
    .first<{ id: number }>();
  if (!row) throw new Error("ユーザーの取得に失敗しました");
  return row.id;
}

export async function findUserEmail(db: D1Database, userId: number): Promise<string | null> {
  const row = await db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{ email: string }>();
  return row?.email ?? null;
}
