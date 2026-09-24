import {
  apiTokenCreatedSchema,
  apiTokenSchema,
  errorResponseSchema,
  meSchema,
  tagSchema,
  todoSchema,
  type ApiToken,
  type ApiTokenCreated,
  type Me,
  type Tag,
  type Todo,
  type TodoCreate,
  type TodoStatus,
  type TodoUpdate,
} from "@tag-todo/shared";
import { z } from "zod";
import { ApiError, SessionExpiredError } from "../lib/errors";

async function request(path: string, init: { method?: string; body?: string } = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
      redirect: "error",
    });
  } catch {
    throw new SessionExpiredError();
  }
  if (res.status === 204) return undefined;
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    if (res.status === 401) throw new SessionExpiredError();
    throw new ApiError(
      res.status,
      parsed.success ? parsed.data.error.message : `エラーが発生しました (${String(res.status)})`,
    );
  }
  return body;
}

export interface TodoQuery {
  status: TodoStatus;
  tag?: string;
}

export async function fetchTodos(query: TodoQuery): Promise<Todo[]> {
  const params = new URLSearchParams({ status: query.status });
  if (query.tag !== undefined) params.set("tag", query.tag);
  return z.array(todoSchema).parse(await request(`/todos?${params.toString()}`));
}

export async function createTodo(input: TodoCreate): Promise<Todo> {
  return todoSchema.parse(await request("/todos", { method: "POST", body: JSON.stringify(input) }));
}

export async function updateTodo(id: number, input: TodoUpdate): Promise<Todo> {
  return todoSchema.parse(await request(`/todos/${String(id)}`, { method: "PATCH", body: JSON.stringify(input) }));
}

export async function deleteTodo(id: number): Promise<void> {
  await request(`/todos/${String(id)}`, { method: "DELETE" });
}

export async function fetchTags(): Promise<Tag[]> {
  return z.array(tagSchema).parse(await request("/tags"));
}

export async function fetchTokens(): Promise<ApiToken[]> {
  return z.array(apiTokenSchema).parse(await request("/tokens"));
}

export async function issueToken(name: string): Promise<ApiTokenCreated> {
  return apiTokenCreatedSchema.parse(await request("/tokens", { method: "POST", body: JSON.stringify({ name }) }));
}

export async function revokeToken(id: number): Promise<void> {
  await request(`/tokens/${String(id)}`, { method: "DELETE" });
}

export async function fetchMe(): Promise<Me> {
  return meSchema.parse(await request("/me"));
}
