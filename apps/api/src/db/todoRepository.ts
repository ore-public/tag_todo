import type { Todo, TodoStatus } from "@tag-todo/shared";
import { sql, type ExpressionBuilder, type Kysely, type Selectable, type UpdateObject } from "kysely";
import type { Database } from "./connection";
import type { DB, Todos } from "./schema";
import { withTransaction } from "./transaction";

export interface TodoFilter {
  status: TodoStatus;
  tag?: string;
  from?: string;
  to?: string;
}

export interface TodoFields {
  title?: string;
  note?: string;
  done?: boolean;
  doDate?: string | null;
  dueDate?: string | null;
  /** 更新時に undefined ならタグを変更しない */
  tags?: string[];
}

/** todo に付いたタグ名の配列（名前順）を返すサブクエリ */
function tagNames(eb: ExpressionBuilder<DB, "todos">) {
  return eb
    .selectFrom("todo_tags")
    .innerJoin("tags", "tags.id", "todo_tags.tag_id")
    .whereRef("todo_tags.todo_id", "=", "todos.id")
    .select(sql<string[]>`coalesce(array_agg(tags.name ORDER BY tags.name), '{}')`.as("names"))
    .as("tags");
}

function selectTodos(db: Kysely<DB>, userId: number) {
  return db.selectFrom("todos").selectAll("todos").select(tagNames).where("todos.user_id", "=", userId);
}

function toTodo(row: Selectable<Todos> & { tags: string[] | null }): Todo {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    done: row.done,
    doDate: row.do_date,
    dueDate: row.due_date,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function listTodos(db: Database, userId: number, filter: TodoFilter): Promise<Todo[]> {
  let query = selectTodos(db, userId);
  if (filter.status !== "all") query = query.where("todos.done", "=", filter.status === "done");
  if (filter.tag !== undefined) {
    const tag = filter.tag;
    query = query.where((eb) =>
      eb.exists(
        eb
          .selectFrom("todo_tags")
          .innerJoin("tags", "tags.id", "todo_tags.tag_id")
          .whereRef("todo_tags.todo_id", "=", "todos.id")
          .where("tags.name", "=", tag)
          .select("todo_tags.todo_id"),
      ),
    );
  }
  if (filter.from !== undefined) query = query.where("todos.do_date", ">=", filter.from);
  if (filter.to !== undefined) query = query.where("todos.do_date", "<=", filter.to);
  const rows = await query
    .orderBy("todos.do_date", (ob) => ob.asc().nullsLast())
    .orderBy("todos.id")
    .execute();
  return rows.map(toTodo);
}

export async function findTodo(db: Database, userId: number, id: number): Promise<Todo | null> {
  const row = await selectTodos(db, userId).where("todos.id", "=", id).executeTakeFirst();
  return row ? toTodo(row) : null;
}

/** todo のタグを names に置き換える。存在しないタグは作る */
async function replaceTags(trx: Kysely<DB>, userId: number, todoId: number, names: string[]) {
  await trx.deleteFrom("todo_tags").where("todo_id", "=", todoId).execute();
  if (names.length === 0) return;
  await trx
    .insertInto("tags")
    .values(names.map((name) => ({ user_id: userId, name })))
    .onConflict((oc) => oc.columns(["user_id", "name"]).doNothing())
    .execute();
  await trx
    .insertInto("todo_tags")
    .columns(["todo_id", "tag_id"])
    .expression((eb) =>
      eb
        .selectFrom("tags")
        .select([eb.val(todoId).as("todo_id"), "tags.id"])
        .where("tags.user_id", "=", userId)
        .where("tags.name", "in", names),
    )
    .execute();
}

export function insertTodo(db: Database, userId: number, fields: TodoFields & { title: string }): Promise<number> {
  return withTransaction(db, async (trx) => {
    const { id } = await trx
      .insertInto("todos")
      .values({
        user_id: userId,
        title: fields.title,
        note: fields.note ?? "",
        do_date: fields.doDate ?? null,
        due_date: fields.dueDate ?? null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await replaceTags(trx, userId, id, fields.tags ?? []);
    return id;
  });
}

function toUpdate(fields: TodoFields): UpdateObject<DB, "todos"> {
  return {
    updated_at: sql<string>`now()`,
    ...(fields.title !== undefined && { title: fields.title }),
    ...(fields.note !== undefined && { note: fields.note }),
    ...(fields.doDate !== undefined && { do_date: fields.doDate }),
    ...(fields.dueDate !== undefined && { due_date: fields.dueDate }),
    ...(fields.done !== undefined && {
      done: fields.done,
      completed_at: fields.done ? sql<string>`now()` : null,
    }),
  };
}

export async function updateTodo(db: Database, userId: number, id: number, fields: TodoFields): Promise<void> {
  await withTransaction(db, async (trx) => {
    await trx.updateTable("todos").set(toUpdate(fields)).where("user_id", "=", userId).where("id", "=", id).execute();
    if (fields.tags !== undefined) await replaceTags(trx, userId, id, fields.tags);
  });
}

export async function deleteTodo(db: Database, userId: number, id: number): Promise<boolean> {
  const result = await db.deleteFrom("todos").where("user_id", "=", userId).where("id", "=", id).executeTakeFirst();
  return result.numDeletedRows > 0n;
}
