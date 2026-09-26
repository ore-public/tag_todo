import type { ApiToken, ApiTokenCreated, Todo } from "@tag-todo/shared";
import { describe, expect, it } from "vitest";
import { app, externalApi, readJson, uniqueUser, webApi } from "./helpers";

async function issueToken(user: string, name = "CLI"): Promise<ApiTokenCreated> {
  const res = await webApi(user, "/tokens", { method: "POST", body: { name } });
  expect(res.status).toBe(201);
  return readJson(res);
}

describe("API トークン", () => {
  it("発行したトークンで外部クライアント用 API を使える", async () => {
    const user = uniqueUser();
    const { token } = await issueToken(user);

    const created = await externalApi(token, "/todos", { method: "POST", body: { title: "CLI から追加" } });
    expect(created.status).toBe(201);

    const todos: Todo[] = await readJson(await webApi(user, "/todos"));
    expect(todos.map((todo) => todo.title)).toEqual(["CLI から追加"]);
  });

  it("一覧には平文のトークンを含まず、使用後は最終利用日時が入る", async () => {
    const user = uniqueUser();
    const { token } = await issueToken(user, "MacBook");
    await externalApi(token, "/tags");

    const tokens: ApiToken[] = await readJson(await webApi(user, "/tokens"));

    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ name: "MacBook" });
    expect(tokens[0]).not.toHaveProperty("token");
    expect(tokens[0]?.lastUsedAt).not.toBeNull();
  });

  it("失効したトークンは使えず、一覧からも消える", async () => {
    const user = uniqueUser();
    const { id, token } = await issueToken(user);

    expect((await webApi(user, `/tokens/${String(id)}`, { method: "DELETE" })).status).toBe(204);

    expect((await externalApi(token, "/todos")).status).toBe(401);
    expect(await readJson(await webApi(user, "/tokens"))).toEqual([]);
    expect((await webApi(user, `/tokens/${String(id)}`, { method: "DELETE" })).status).toBe(404);
  });

  it("他のユーザーのトークンは失効できない", async () => {
    const { id } = await issueToken(uniqueUser());
    expect((await webApi(uniqueUser(), `/tokens/${String(id)}`, { method: "DELETE" })).status).toBe(404);
  });

  it.each([
    ["存在しないトークン", { Authorization: "Bearer tagtodo_unknown" }],
    ["形式が違うトークン", { Authorization: "Bearer abc" }],
    ["Authorization ヘッダーなし", { Authorization: "" }],
  ])("%s では 401", async (_, headers) => {
    const res = await app.request("/api/v1/todos", { headers });
    expect(res.status).toBe(401);
    expect(await readJson(res)).toMatchObject({ error: { code: "unauthorized" } });
  });

  it("トークンの発行・一覧は外部クライアント用 API からは使えない", async () => {
    const { token } = await issueToken(uniqueUser());
    expect((await externalApi(token, "/tokens")).status).toBe(404);
  });
});

describe("CORS", () => {
  it("許可したオリジンからのプリフライトリクエストを許可する", async () => {
    const res = await app.request("/api/v1/todos", {
      method: "OPTIONS",
      headers: { Origin: "https://app.example.com", "Access-Control-Request-Method": "POST" },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
  });

  it("許可していないオリジンには Access-Control-Allow-Origin を返さない", async () => {
    const res = await app.request("/api/v1/todos", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.com", "Access-Control-Request-Method": "POST" },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
