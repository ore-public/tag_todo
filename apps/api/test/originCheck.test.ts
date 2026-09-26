import { describe, expect, it } from "vitest";
import { app, uniqueUser } from "./helpers";

function post(headers: Record<string, string>) {
  return app.request("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Dev-User-Email": uniqueUser(), ...headers },
    body: JSON.stringify({ title: "a" }),
  });
}

describe("Origin の確認（CSRF 対策）", () => {
  it("自サイトからの更新は受け付ける", async () => {
    expect((await post({ Origin: "https://todo.example.com" })).status).toBe(201);
  });

  it.each([
    ["他のサイトから", { Origin: "https://evil.example.com" }],
    ["Origin ヘッダーなしで", {}],
  ])("%s更新しようとすると 403", async (_, headers) => {
    const res = await post(headers);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "forbidden" } });
  });

  it("読み取りは Origin ヘッダーがなくても受け付ける", async () => {
    const res = await app.request("/api/todos", { headers: { "X-Dev-User-Email": uniqueUser() } });
    expect(res.status).toBe(200);
  });

  it("API トークンで認証する /api/v1/* は確認しない", async () => {
    const res = await app.request("/api/v1/todos", { method: "POST", headers: { Authorization: "Bearer x" } });
    expect(res.status).toBe(401);
  });
});
