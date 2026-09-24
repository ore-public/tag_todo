import type { Todo } from "@tag-todo/shared";
import { exports } from "cloudflare:workers";
import { expect } from "vitest";

const BASE_URL = "https://tag-todo.example.com";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function send(path: string, options: RequestOptions, headers: Record<string, string>) {
  return exports.default.fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json", ...headers, ...options.headers },
    body: options.body === undefined ? null : JSON.stringify(options.body),
  });
}

/** Web 画面用 API（/api/*）を、開発モードで指定したユーザーとして呼ぶ */
export function webApi(user: string, path: string, options: RequestOptions = {}) {
  return send(`/api${path}`, options, { "X-Dev-User-Email": user });
}

/** 外部クライアント用 API（/api/v1/*）を API トークンで呼ぶ */
export function externalApi(token: string, path: string, options: RequestOptions = {}) {
  return send(`/api/v1${path}`, options, { Authorization: `Bearer ${token}` });
}

/** テストごとに別のユーザーを使い、データが混ざらないようにする */
export function uniqueUser(): string {
  return `user-${crypto.randomUUID()}@example.com`;
}

export async function createTodo(user: string, body: Record<string, unknown>): Promise<Todo> {
  const res = await webApi(user, "/todos", { method: "POST", body });
  expect(res.status).toBe(201);
  return res.json();
}
