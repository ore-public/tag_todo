import type { Database } from "../db/connection";
import { findOrCreateUser, findUserEmail } from "../db/userRepository";
import { AppError } from "./errors";

/** 認証基盤で確認済みのユーザーを、アプリのユーザー id に対応付ける */
export function resolveUser(db: Database, identity: { subject: string; email: string }): Promise<number> {
  return findOrCreateUser(db, identity.subject, identity.email.toLowerCase());
}

export async function getUserEmail(db: Database, userId: number): Promise<string> {
  const email = await findUserEmail(db, userId);
  if (email === null) throw new AppError("not_found", "ユーザーが見つかりません");
  return email;
}
