import type { Tag } from "@tag-todo/shared";
import type { Database } from "./connection";

export async function listTags(db: Database, userId: number): Promise<Tag[]> {
  const rows = await db
    .selectFrom("tags")
    .select(["tags.id", "tags.name"])
    .select((eb) =>
      eb
        .selectFrom("todo_tags")
        .innerJoin("todos", "todos.id", "todo_tags.todo_id")
        .whereRef("todo_tags.tag_id", "=", "tags.id")
        .where("todos.done", "=", false)
        .select((count) => count.fn.countAll<number>().as("count"))
        .as("open_count"),
    )
    .where("tags.user_id", "=", userId)
    .orderBy("tags.name")
    .execute();
  return rows.map((row) => ({ id: row.id, name: row.name, openCount: row.open_count ?? 0 }));
}

export async function renameTag(db: Database, userId: number, id: number, name: string): Promise<boolean> {
  const result = await db
    .updateTable("tags")
    .set({ name })
    .where("user_id", "=", userId)
    .where("id", "=", id)
    .executeTakeFirst();
  return result.numUpdatedRows > 0n;
}

export async function deleteTag(db: Database, userId: number, id: number): Promise<boolean> {
  const result = await db.deleteFrom("tags").where("user_id", "=", userId).where("id", "=", id).executeTakeFirst();
  return result.numDeletedRows > 0n;
}
