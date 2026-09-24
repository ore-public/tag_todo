import {
  errorResponseSchema,
  tagSchema,
  todoSchema,
  type Tag,
  type Todo,
  type TodoCreate,
  type TodoListQuery,
  type TodoUpdate,
} from "@tag-todo/shared";
import { z } from "zod";
import { CliError } from "./errors";

export type FetchFn = typeof fetch;

/** 外部クライアント用 API（/api/v1/*）のクライアント */
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetchFn(new URL(`/api/v1${path}`, this.baseUrl), {
        method,
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: body === undefined ? null : JSON.stringify(body),
        redirect: "manual",
      });
    } catch (error) {
      throw new CliError(
        "network_error",
        `サーバーに接続できません: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (res.status === 204) return undefined;
    const json: unknown = await res.json().catch(() => undefined);
    if (!res.ok) {
      const parsed = errorResponseSchema.safeParse(json);
      if (parsed.success) throw new CliError(parsed.data.error.code, parsed.data.error.message);
      throw new CliError("http_error", `サーバーがエラーを返しました (HTTP ${String(res.status)})`);
    }
    return json;
  }

  async listTodos(query: TodoListQuery): Promise<Todo[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string") params.set(key, value);
    }
    return z.array(todoSchema).parse(await this.request("GET", `/todos?${params.toString()}`));
  }

  async getTodo(id: number): Promise<Todo> {
    return todoSchema.parse(await this.request("GET", `/todos/${String(id)}`));
  }

  async createTodo(input: TodoCreate): Promise<Todo> {
    return todoSchema.parse(await this.request("POST", "/todos", input));
  }

  async updateTodo(id: number, input: TodoUpdate): Promise<Todo> {
    return todoSchema.parse(await this.request("PATCH", `/todos/${String(id)}`, input));
  }

  async deleteTodo(id: number): Promise<void> {
    await this.request("DELETE", `/todos/${String(id)}`);
  }

  async listTags(): Promise<Tag[]> {
    return z.array(tagSchema).parse(await this.request("GET", "/tags"));
  }
}
