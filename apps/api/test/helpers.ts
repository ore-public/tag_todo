import type { Todo } from "@tag-todo/shared";
import { expect } from "vitest";
import { createApp } from "../src/http/app";
import { testDb } from "./database";

export const PUBLIC_ORIGIN = "https://todo.example.com";

/** 開発モードの認証で組み立てたアプリ */
export const app = createApp({
  db: testDb,
  config: {
    publicOrigin: PUBLIC_ORIGIN,
    corsOrigins: ["https://app.example.com"],
    auth: { kind: "dev", defaultEmail: "dev@example.com" },
  },
});

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function send(path: string, options: RequestOptions, headers: Record<string, string>) {
  return app.request(path, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json", ...headers, ...options.headers },
    body: options.body === undefined ? null : JSON.stringify(options.body),
  });
}

/** Web 画面用 API（/api/*）を、開発モードで指定したユーザーとして、自サイトから呼ぶ */
export function webApi(user: string, path: string, options: RequestOptions = {}) {
  return send(`/api${path}`, options, { "X-Dev-User-Email": user, Origin: PUBLIC_ORIGIN });
}

/** 外部クライアント用 API（/api/v1/*）を API トークンで呼ぶ */
export function externalApi(token: string, path: string, options: RequestOptions = {}) {
  return send(`/api/v1${path}`, options, { Authorization: `Bearer ${token}` });
}

/** テストごとに別のユーザーを使い、データが混ざらないようにする */
export function uniqueUser(): string {
  return `user-${crypto.randomUUID()}@example.com`;
}

/** レスポンスの JSON を、代入先の型として読む */
export function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export async function createTodo(user: string, body: Record<string, unknown>): Promise<Todo> {
  const res = await webApi(user, "/todos", { method: "POST", body });
  expect(res.status).toBe(201);
  return readJson(res);
}
