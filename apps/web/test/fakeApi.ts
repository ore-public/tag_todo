import type { ApiToken, Todo } from "@tag-todo/shared";
import { vi } from "vitest";

/** テスト用に、メモリ上のデータで /api/* に応答する fetch を差し込む */
export function installFakeApi(initialTodos: Todo[]) {
  const todos = [...initialTodos];
  const tokens: ApiToken[] = [];
  const requests: { method: string; path: string; body: unknown }[] = [];

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const route = (method: string, url: URL, body: unknown): Response => {
    const id = Number(url.pathname.split("/")[3]);
    const index = todos.findIndex((todo) => todo.id === id);
    const key = `${method} ${url.pathname.replace(/\/\d+$/, "/:id")}`;
    switch (key) {
      case "GET /api/me":
        return json({ email: "me@example.com" });
      case "GET /api/tags":
        return json([]);
      case "GET /api/tokens":
        return json(tokens);
      case "POST /api/tokens": {
        const token = {
          id: 1,
          name: (body as { name: string }).name,
          createdAt: "2026-09-25T00:00:00Z",
          lastUsedAt: null,
        };
        tokens.push(token);
        return json({ ...token, token: "tagtodo_secret" }, 201);
      }
      case "GET /api/todos": {
        const status = url.searchParams.get("status");
        return json(status === "all" ? todos : todos.filter((todo) => !todo.done));
      }
      case "POST /api/todos": {
        const created = {
          ...todos[0],
          ...(body as Partial<Todo>),
          id: todos.length + 100,
          tags: [],
          done: false,
        } as Todo;
        todos.push(created);
        return json(created, 201);
      }
      case "PATCH /api/todos/:id":
        todos[index] = { ...todos[index], ...(body as Partial<Todo>) } as Todo;
        return json(todos[index]);
      case "DELETE /api/todos/:id":
        todos.splice(index, 1);
        return new Response(null, { status: 204 });
      default:
        return json({ error: { code: "not_found", message: key } }, 404);
    }
  };

  vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
    const url = new URL(input, "http://localhost");
    const method = init.method ?? "GET";
    const body: unknown = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: url.pathname + url.search, body });
    return Promise.resolve(route(method, url, body));
  });

  return { todos, requests };
}

export function todo(fields: Partial<Todo> & { id: number; title: string }): Todo {
  return {
    note: "",
    done: false,
    doDate: null,
    dueDate: null,
    tags: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    ...fields,
  };
}
