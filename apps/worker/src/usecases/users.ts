import { findOrCreateUser, findUserEmail } from "../db/userRepository";
import { AppError } from "./errors";

export function resolveUserByEmail(db: D1Database, email: string): Promise<number> {
  return findOrCreateUser(db, email.toLowerCase());
}

export async function getUserEmail(db: D1Database, userId: number): Promise<string> {
  const email = await findUserEmail(db, userId);
  if (email === null) throw new AppError("not_found", "ユーザーが見つかりません");
  return email;
}
