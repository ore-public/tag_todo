import type { Tag } from "@tag-todo/shared";

interface TagRow {
  id: number;
  name: string;
  open_count: number;
}

export async function listTags(db: D1Database, userId: number): Promise<Tag[]> {
  const { results } = await db
    .prepare(
      `SELECT tg.id, tg.name,
         (SELECT count(*) FROM todo_tags tt JOIN todos t ON t.id = tt.todo_id
          WHERE tt.tag_id = tg.id AND t.done = 0) AS open_count
       FROM tags tg WHERE tg.user_id = ? ORDER BY tg.name`,
    )
    .bind(userId)
    .all<TagRow>();
  return results.map((row) => ({ id: row.id, name: row.name, openCount: row.open_count }));
}

export async function renameTag(db: D1Database, userId: number, id: number, name: string): Promise<boolean> {
  const result = await db.prepare("UPDATE tags SET name = ? WHERE user_id = ? AND id = ?").bind(name, userId, id).run();
  return result.meta.changes > 0;
}

export async function deleteTag(db: D1Database, userId: number, id: number): Promise<boolean> {
  const result = await db.prepare("DELETE FROM tags WHERE user_id = ? AND id = ?").bind(userId, id).run();
  return result.meta.changes > 0;
}
