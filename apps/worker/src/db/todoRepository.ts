import type { Todo, TodoStatus } from "@tag-todo/shared";
import { NOW_SQL, placeholders } from "./sql";

interface TodoRow {
  id: number;
  title: string;
  note: string;
  done: number;
  do_date: string | null;
  due_date: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

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

const SELECT_TODO = `
  SELECT t.*,
    (SELECT json_group_array(name) FROM (
      SELECT tg.name FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id
      WHERE tt.todo_id = t.id ORDER BY tg.name
    )) AS tags
  FROM todos t`;

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    done: row.done === 1,
    doDate: row.do_date,
    dueDate: row.due_date,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function buildWhere(userId: number, filter: TodoFilter): { sql: string; params: unknown[] } {
  const conditions = ["t.user_id = ?"];
  const params: unknown[] = [userId];
  if (filter.status !== "all") {
    conditions.push("t.done = ?");
    params.push(filter.status === "done" ? 1 : 0);
  }
  if (filter.tag !== undefined) {
    conditions.push(
      "EXISTS (SELECT 1 FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.todo_id = t.id AND tg.name = ?)",
    );
    params.push(filter.tag);
  }
  if (filter.from !== undefined) {
    conditions.push("t.do_date >= ?");
    params.push(filter.from);
  }
  if (filter.to !== undefined) {
    conditions.push("t.do_date <= ?");
    params.push(filter.to);
  }
  return { sql: conditions.join(" AND "), params };
}

export async function listTodos(db: D1Database, userId: number, filter: TodoFilter) {
  const where = buildWhere(userId, filter);
  const { results } = await db
    .prepare(`${SELECT_TODO} WHERE ${where.sql} ORDER BY t.do_date IS NULL, t.do_date, t.id`)
    .bind(...where.params)
    .all<TodoRow>();
  return results.map(toTodo);
}

export async function findTodo(db: D1Database, userId: number, id: number) {
  const row = await db.prepare(`${SELECT_TODO} WHERE t.user_id = ? AND t.id = ?`).bind(userId, id).first<TodoRow>();
  return row ? toTodo(row) : null;
}

function upsertTagsStatements(db: D1Database, userId: number, tags: string[]) {
  return tags.map((name) => db.prepare("INSERT OR IGNORE INTO tags (user_id, name) VALUES (?, ?)").bind(userId, name));
}

/** todoId には todo の id か、id を返すサブクエリを指定する */
function linkTagsStatement(db: D1Database, userId: number, todoId: { sql: string; params: unknown[] }, tags: string[]) {
  return db
    .prepare(
      `INSERT INTO todo_tags (todo_id, tag_id)
       SELECT ${todoId.sql}, id FROM tags WHERE user_id = ? AND name IN (${placeholders(tags.length)})`,
    )
    .bind(...todoId.params, userId, ...tags);
}

export async function insertTodo(
  db: D1Database,
  userId: number,
  fields: TodoFields & { title: string },
): Promise<number> {
  const tags = fields.tags ?? [];
  const insert = db
    .prepare("INSERT INTO todos (user_id, title, note, do_date, due_date) VALUES (?, ?, ?, ?, ?) RETURNING id")
    .bind(userId, fields.title, fields.note ?? "", fields.doDate ?? null, fields.dueDate ?? null);
  const statements = [...upsertTagsStatements(db, userId, tags), insert];
  if (tags.length > 0) {
    // 同じトランザクション内で直前に追加した todo の id を参照する
    const lastInserted = { sql: "(SELECT max(id) FROM todos WHERE user_id = ?)", params: [userId] };
    statements.push(linkTagsStatement(db, userId, lastInserted, tags));
  }
  const results = await db.batch<{ id: number }>(statements);
  const inserted = results[tags.length]?.results[0];
  if (!inserted) throw new Error("todo の追加に失敗しました");
  return inserted.id;
}

const COLUMN_BY_FIELD = {
  title: "title",
  note: "note",
  doDate: "do_date",
  dueDate: "due_date",
} as const satisfies Record<Exclude<keyof TodoFields, "done" | "tags">, string>;

function buildSet(fields: TodoFields): { sql: string; params: unknown[] } {
  const assignments = [`updated_at = ${NOW_SQL}`];
  const params: unknown[] = [];
  for (const [field, column] of Object.entries(COLUMN_BY_FIELD)) {
    const value = fields[field as keyof typeof COLUMN_BY_FIELD];
    if (value !== undefined) {
      assignments.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (fields.done !== undefined) {
    assignments.push("done = ?", `completed_at = ${fields.done ? NOW_SQL : "NULL"}`);
    params.push(fields.done ? 1 : 0);
  }
  return { sql: assignments.join(", "), params };
}

export async function updateTodo(db: D1Database, userId: number, id: number, fields: TodoFields): Promise<void> {
  const { tags } = fields;
  const set = buildSet(fields);
  const statements = [
    db.prepare(`UPDATE todos SET ${set.sql} WHERE user_id = ? AND id = ?`).bind(...set.params, userId, id),
  ];
  if (tags !== undefined) {
    statements.push(
      ...upsertTagsStatements(db, userId, tags),
      db.prepare("DELETE FROM todo_tags WHERE todo_id = ?").bind(id),
    );
    if (tags.length > 0) {
      statements.push(linkTagsStatement(db, userId, { sql: "?", params: [id] }, tags));
    }
  }
  await db.batch(statements);
}

export async function deleteTodo(db: D1Database, userId: number, id: number): Promise<boolean> {
  const result = await db.prepare("DELETE FROM todos WHERE user_id = ? AND id = ?").bind(userId, id).run();
  return result.meta.changes > 0;
}
