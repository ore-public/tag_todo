import type { Database } from "../db/connection";
import type { Todo } from "@tag-todo/shared";
import * as repo from "../db/todoRepository";
import type { TodoFields, TodoFilter } from "../db/todoRepository";
import { AppError } from "./errors";

export function listTodos(db: Database, userId: number, filter: TodoFilter): Promise<Todo[]> {
  return repo.listTodos(db, userId, filter);
}

export async function getTodo(db: Database, userId: number, id: number): Promise<Todo> {
  const todo = await repo.findTodo(db, userId, id);
  if (!todo) throw new AppError("not_found", `todo ${String(id)} が見つかりません`);
  return todo;
}

export async function createTodo(db: Database, userId: number, input: TodoFields & { title: string }): Promise<Todo> {
  const id = await repo.insertTodo(db, userId, input);
  return getTodo(db, userId, id);
}

export async function updateTodo(db: Database, userId: number, id: number, input: TodoFields): Promise<Todo> {
  await getTodo(db, userId, id);
  await repo.updateTodo(db, userId, id, input);
  return getTodo(db, userId, id);
}

export async function deleteTodo(db: Database, userId: number, id: number): Promise<void> {
  if (!(await repo.deleteTodo(db, userId, id))) {
    throw new AppError("not_found", `todo ${String(id)} が見つかりません`);
  }
}
