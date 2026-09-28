import type { ApiToken, ApiTokenCreated } from "@tag-todo/shared";
import { describe, expect, it } from "vitest";
import { app, createTodo, readJson, uniqueUser, webApi } from "./helpers";

async function issueFeed(user: string, name = "Google Calendar"): Promise<ApiTokenCreated> {
  const res = await webApi(user, "/calendar-feeds", { method: "POST", body: { name } });
  expect(res.status).toBe(201);
  return readJson(res);
}

function fetchFeed(token: string) {
  return app.request(`/ical/${token}.ics`);
}

describe("カレンダーのフィード", () => {
  it("発行したトークンの URL で、未完了で日付のある todo を iCal 形式で取得できる", async () => {
    const user = uniqueUser();
    await createTodo(user, { title: "実施日あり", doDate: "2026-09-30" });
    await createTodo(user, { title: "期限日だけ", dueDate: "2026-10-05" });
    await createTodo(user, { title: "日付なし" });
    const done = await createTodo(user, { title: "完了済み", doDate: "2026-09-28" });
    await webApi(user, `/todos/${String(done.id)}`, { method: "PATCH", body: { done: true } });
    await createTodo(uniqueUser(), { title: "他のユーザーの todo", doDate: "2026-09-30" });
    const { token } = await issueFeed(user);

    const res = await fetchFeed(token);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    const body = await res.text();
    const summaries = body.split("\r\n").filter((line) => line.startsWith("SUMMARY:"));
    expect(summaries).toEqual(["SUMMARY:実施日あり", "SUMMARY:期限: 期限日だけ"]);
  });

  it("一覧には平文のトークンを含まず、フィードの取得後は最終利用日時が入る", async () => {
    const user = uniqueUser();
    const { token } = await issueFeed(user, "スマホ");
    await fetchFeed(token);

    const feeds: ApiToken[] = await readJson(await webApi(user, "/calendar-feeds"));

    expect(feeds).toHaveLength(1);
    expect(feeds[0]).toMatchObject({ name: "スマホ" });
    expect(feeds[0]).not.toHaveProperty("token");
    expect(feeds[0]?.lastUsedAt).not.toBeNull();
  });

  it("失効したトークンではフィードを取得できず、一覧からも消える", async () => {
    const user = uniqueUser();
    const { id, token } = await issueFeed(user);

    expect((await webApi(user, `/calendar-feeds/${String(id)}`, { method: "DELETE" })).status).toBe(204);

    expect((await fetchFeed(token)).status).toBe(404);
    expect(await readJson(await webApi(user, "/calendar-feeds"))).toEqual([]);
  });

  it("他のユーザーのトークンは失効できない", async () => {
    const { id } = await issueFeed(uniqueUser());
    expect((await webApi(uniqueUser(), `/calendar-feeds/${String(id)}`, { method: "DELETE" })).status).toBe(404);
  });

  it.each([
    ["存在しないトークン", "/ical/tagtodocal_unknown.ics"],
    ["拡張子がない", "/ical/tagtodocal_unknown"],
  ])("%s では 404", async (_, path) => {
    expect((await app.request(path)).status).toBe(404);
  });

  it("API トークンではフィードを取得できず、フィード用トークンでは API を使えない", async () => {
    const user = uniqueUser();
    const apiRes = await webApi(user, "/tokens", { method: "POST", body: { name: "CLI" } });
    const { token: apiToken } = await readJson<ApiTokenCreated>(apiRes);
    const { token: feedToken } = await issueFeed(user);

    expect((await fetchFeed(apiToken)).status).toBe(404);
    const res = await app.request("/api/v1/todos", { headers: { Authorization: `Bearer ${feedToken}` } });
    expect(res.status).toBe(401);
  });
});
