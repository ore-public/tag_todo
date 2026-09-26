import type { Tag, Todo } from "@tag-todo/shared";
import { describe, expect, it } from "vitest";
import { createTodo, readJson, uniqueUser, webApi } from "./helpers";

async function listTags(user: string): Promise<Tag[]> {
  return readJson(await webApi(user, "/tags"));
}

describe("タグ", () => {
  it("名前順に並び、未完了の todo の件数を返す", async () => {
    const user = uniqueUser();
    await createTodo(user, { title: "a", tags: ["b-tag", "a-tag"] });
    const done = await createTodo(user, { title: "b", tags: ["a-tag"] });
    await webApi(user, `/todos/${String(done.id)}`, { method: "PATCH", body: { done: true } });

    const tags = await listTags(user);

    expect(tags.map(({ name, openCount }) => ({ name, openCount }))).toEqual([
      { name: "a-tag", openCount: 1 },
      { name: "b-tag", openCount: 1 },
    ]);
  });

  it("名前を変更すると todo のタグ名も変わる", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "a", tags: ["旧"] });
    const [tag] = await listTags(user);

    const res = await webApi(user, `/tags/${String(tag?.id)}`, { method: "PATCH", body: { name: "新" } });

    expect(res.status).toBe(204);
    const updated: Todo = await readJson(await webApi(user, `/todos/${String(todo.id)}`));
    expect(updated.tags).toEqual(["新"]);
  });

  it("既に存在する名前には変更できない", async () => {
    const user = uniqueUser();
    await createTodo(user, { title: "a", tags: ["x", "y"] });
    const [tagX] = await listTags(user);

    const res = await webApi(user, `/tags/${String(tagX?.id)}`, { method: "PATCH", body: { name: "y" } });

    expect(res.status).toBe(409);
    expect(await readJson(res)).toMatchObject({ error: { code: "conflict" } });
  });

  it("削除すると todo からも外れる", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "a", tags: ["消す", "残す"] });
    const tag = (await listTags(user)).find(({ name }) => name === "消す");

    expect((await webApi(user, `/tags/${String(tag?.id)}`, { method: "DELETE" })).status).toBe(204);

    const updated: Todo = await readJson(await webApi(user, `/todos/${String(todo.id)}`));
    expect(updated.tags).toEqual(["残す"]);
  });

  it("存在しないタグの変更・削除は 404", async () => {
    const user = uniqueUser();
    expect((await webApi(user, "/tags/999999", { method: "PATCH", body: { name: "a" } })).status).toBe(404);
    expect((await webApi(user, "/tags/999999", { method: "DELETE" })).status).toBe(404);
  });
});
