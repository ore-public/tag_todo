import type { Database } from "../db/connection";
import type { Tag } from "@tag-todo/shared";
import * as repo from "../db/tagRepository";
import { isUniqueViolation } from "../db/transaction";
import { AppError } from "./errors";

export function listTags(db: Database, userId: number): Promise<Tag[]> {
  return repo.listTags(db, userId);
}

export async function renameTag(db: Database, userId: number, id: number, name: string): Promise<void> {
  let changed: boolean;
  try {
    changed = await repo.renameTag(db, userId, id, name);
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("conflict", `タグ「${name}」は既に存在します`);
    throw error;
  }
  if (!changed) throw new AppError("not_found", `タグ ${String(id)} が見つかりません`);
}

export async function deleteTag(db: Database, userId: number, id: number): Promise<void> {
  if (!(await repo.deleteTag(db, userId, id))) {
    throw new AppError("not_found", `タグ ${String(id)} が見つかりません`);
  }
}
