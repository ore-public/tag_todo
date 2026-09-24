import type { Tag } from "@tag-todo/shared";
import { isUniqueConstraintError } from "../db/sql";
import * as repo from "../db/tagRepository";
import { AppError } from "./errors";

export function listTags(db: D1Database, userId: number): Promise<Tag[]> {
  return repo.listTags(db, userId);
}

export async function renameTag(db: D1Database, userId: number, id: number, name: string): Promise<void> {
  let changed: boolean;
  try {
    changed = await repo.renameTag(db, userId, id, name);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new AppError("conflict", `タグ「${name}」は既に存在します`);
    throw error;
  }
  if (!changed) throw new AppError("not_found", `タグ ${String(id)} が見つかりません`);
}

export async function deleteTag(db: D1Database, userId: number, id: number): Promise<void> {
  if (!(await repo.deleteTag(db, userId, id))) {
    throw new AppError("not_found", `タグ ${String(id)} が見つかりません`);
  }
}
