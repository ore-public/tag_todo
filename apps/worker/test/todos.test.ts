import type { Todo } from "@tag-todo/shared";
import { describe, expect, it } from "vitest";
import { createTodo, uniqueUser, webApi } from "./helpers";

async function listTitles(user: string, query = ""): Promise<string[]> {
  const res = await webApi(user, `/todos${query}`);
  expect(res.status).toBe(200);
  const todos: Todo[] = await res.json();
  return todos.map((todo) => todo.title);
}

describe("todo の作成", () => {
  it("タグ・実施日・期限を指定して作成できる", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, {
      title: "買い物",
      note: "牛乳",
      doDate: "2026-09-25",
      dueDate: "2026-09-30",
      tags: ["家", "急ぎ"],
    });

    expect(todo).toMatchObject({
      title: "買い物",
      note: "牛乳",
      done: false,
      doDate: "2026-09-25",
      dueDate: "2026-09-30",
      tags: ["家", "急ぎ"],
      completedAt: null,
    });
  });

  it("タイトルが空なら 400", async () => {
    const res = await webApi(uniqueUser(), "/todos", { method: "POST", body: { title: "" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "invalid_request" } });
  });
});

describe("todo の一覧", () => {
  it("実施日の昇順で並び、実施日がないものは最後になる", async () => {
    const user = uniqueUser();
    await createTodo(user, { title: "日付なし" });
    await createTodo(user, { title: "26日", doDate: "2026-09-26" });
    await createTodo(user, { title: "25日", doDate: "2026-09-25" });

    expect(await listTitles(user)).toEqual(["25日", "26日", "日付なし"]);
  });

  it("タグで絞り込める", async () => {
    const user = uniqueUser();
    await createTodo(user, { title: "仕事の todo", tags: ["仕事"] });
    await createTodo(user, { title: "家の todo", tags: ["家"] });

    expect(await listTitles(user, "?tag=仕事")).toEqual(["仕事の todo"]);
  });

  it("実施日の範囲で絞り込める", async () => {
    const user = uniqueUser();
    await createTodo(user, { title: "24日", doDate: "2026-09-24" });
    await createTodo(user, { title: "25日", doDate: "2026-09-25" });
    await createTodo(user, { title: "26日", doDate: "2026-09-26" });
    await createTodo(user, { title: "日付なし" });

    expect(await listTitles(user, "?from=2026-09-25&to=2026-09-25")).toEqual(["25日"]);
    expect(await listTitles(user, "?to=2026-09-25")).toEqual(["24日", "25日"]);
  });

  it("既定では未完了だけ返し、status で完了済みや全件を指定できる", async () => {
    const user = uniqueUser();
    await createTodo(user, { title: "未完了" });
    const done = await createTodo(user, { title: "完了" });
    await webApi(user, `/todos/${String(done.id)}`, { method: "PATCH", body: { done: true } });

    expect(await listTitles(user)).toEqual(["未完了"]);
    expect(await listTitles(user, "?status=done")).toEqual(["完了"]);
    expect(await listTitles(user, "?status=all")).toEqual(["未完了", "完了"]);
  });

  it("不正な日付で絞り込むと 400", async () => {
    const res = await webApi(uniqueUser(), "/todos?from=2026-13-01");
    expect(res.status).toBe(400);
  });
});

describe("todo の更新", () => {
  it("指定した項目だけ更新される", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "元のタイトル", note: "メモ", doDate: "2026-09-25" });

    const res = await webApi(user, `/todos/${String(todo.id)}`, {
      method: "PATCH",
      body: { doDate: "2026-09-26" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ title: "元のタイトル", note: "メモ", doDate: "2026-09-26" });
  });

  it("実施日と期限に null を指定すると未設定になる", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "a", doDate: "2026-09-25", dueDate: "2026-09-30" });

    const res = await webApi(user, `/todos/${String(todo.id)}`, {
      method: "PATCH",
      body: { doDate: null, dueDate: null },
    });

    expect(await res.json()).toMatchObject({ doDate: null, dueDate: null });
  });

  it("タグを指定すると置き換わり、省略すると変わらない", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "a", tags: ["古い"] });
    const path = `/todos/${String(todo.id)}`;

    const replaced = await webApi(user, path, { method: "PATCH", body: { tags: ["新しい", "追加"] } });
    expect(await replaced.json()).toMatchObject({ tags: ["新しい", "追加"] });

    const unchanged = await webApi(user, path, { method: "PATCH", body: { title: "b" } });
    expect(await unchanged.json()).toMatchObject({ title: "b", tags: ["新しい", "追加"] });

    const cleared = await webApi(user, path, { method: "PATCH", body: { tags: [] } });
    expect(await cleared.json()).toMatchObject({ tags: [] });
  });

  it("完了にすると完了日時が入り、未完了に戻すと消える", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "a" });
    const path = `/todos/${String(todo.id)}`;

    const done: Todo = await (await webApi(user, path, { method: "PATCH", body: { done: true } })).json();
    expect(done.done).toBe(true);
    expect(done.completedAt).not.toBeNull();

    const undone: Todo = await (await webApi(user, path, { method: "PATCH", body: { done: false } })).json();
    expect(undone.done).toBe(false);
    expect(undone.completedAt).toBeNull();
  });

  it("存在しない todo は 404", async () => {
    const res = await webApi(uniqueUser(), "/todos/999999", { method: "PATCH", body: { title: "a" } });
    expect(res.status).toBe(404);
  });
});

describe("todo の取得と削除", () => {
  it("1件取得できる", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "a" });

    const res = await webApi(user, `/todos/${String(todo.id)}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: todo.id, title: "a" });
  });

  it("削除すると取得できなくなる", async () => {
    const user = uniqueUser();
    const todo = await createTodo(user, { title: "a" });
    const path = `/todos/${String(todo.id)}`;

    expect((await webApi(user, path, { method: "DELETE" })).status).toBe(204);
    expect((await webApi(user, path)).status).toBe(404);
    expect((await webApi(user, path, { method: "DELETE" })).status).toBe(404);
  });

  it("id が数値でなければ 400", async () => {
    expect((await webApi(uniqueUser(), "/todos/abc")).status).toBe(400);
  });
});

describe("ユーザー間のデータ分離", () => {
  it("他のユーザーの todo は一覧に出ず、取得・更新・削除もできない", async () => {
    const owner = uniqueUser();
    const other = uniqueUser();
    const todo = await createTodo(owner, { title: "owner の todo", tags: ["秘密"] });
    const path = `/todos/${String(todo.id)}`;

    expect(await listTitles(other, "?status=all")).toEqual([]);
    expect((await webApi(other, path)).status).toBe(404);
    expect((await webApi(other, path, { method: "PATCH", body: { title: "x" } })).status).toBe(404);
    expect((await webApi(other, path, { method: "DELETE" })).status).toBe(404);
    expect(await (await webApi(other, "/tags")).json()).toEqual([]);
  });

  it("同じタグ名でもユーザーごとに別のタグになる", async () => {
    const userA = uniqueUser();
    const userB = uniqueUser();
    await createTodo(userA, { title: "A の todo", tags: ["共通"] });
    await createTodo(userB, { title: "B の todo", tags: ["共通"] });

    expect(await listTitles(userA, "?tag=共通")).toEqual(["A の todo"]);
    expect(await listTitles(userB, "?tag=共通")).toEqual(["B の todo"]);
  });
});
