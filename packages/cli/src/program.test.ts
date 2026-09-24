import type { Todo } from "@tag-todo/shared";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { CliDeps } from "./context";
import { run } from "./program";

const sampleTodo: Todo = {
  id: 12,
  title: "買い物",
  note: "牛乳",
  done: false,
  doDate: "2026-09-25",
  dueDate: "2026-09-30",
  tags: ["家"],
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  completedAt: null,
};

interface Sent {
  method: string;
  url: string;
  authorization: string | null;
  body: unknown;
}

/** API への送信内容を記録し、決められた応答を返すテスト用の CLI 実行環境 */
async function setup(options: { env?: NodeJS.ProcessEnv; respond?: (sent: Sent) => Response } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "tagtodo-test-"));
  const sent: Sent[] = [];
  let stdout = "";
  let stderr = "";
  const deps: CliDeps = {
    env: options.env ?? { TAGTODO_URL: "https://todo.example.com", TAGTODO_TOKEN: "tagtodo_abc" },
    configPath: join(dir, "config.json"),
    today: () => "2026-09-25",
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
    fetchFn: (input, init) => {
      const request = {
        method: init?.method ?? "GET",
        url: input instanceof Request ? input.url : input.toString(),
        authorization: new Headers(init?.headers).get("Authorization"),
        body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
      };
      sent.push(request);
      return Promise.resolve(options.respond?.(request) ?? Response.json(sampleTodo));
    },
  };
  return {
    sent,
    configPath: deps.configPath,
    run: async (...args: string[]) => {
      stdout = "";
      stderr = "";
      const code = await run(args, deps);
      return { code, stdout, stderr };
    },
  };
}

describe("list", () => {
  let cli: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    cli = await setup({ respond: () => Response.json([sampleTodo]) });
  });

  it("未完了の一覧を表示する", async () => {
    const result = await cli.run("list");

    expect(result).toEqual({
      code: 0,
      stdout: "#12  [ ]  2026-09-25(金)  買い物  #家  (期限 2026-09-30(水))\n",
      stderr: "",
    });
    expect(cli.sent[0]).toEqual({
      method: "GET",
      url: "https://todo.example.com/api/v1/todos?status=open",
      authorization: "Bearer tagtodo_abc",
      body: undefined,
    });
  });

  it("--json で JSON を出力する", async () => {
    const result = await cli.run("list", "--json");
    expect(JSON.parse(result.stdout)).toEqual([sampleTodo]);
  });

  it.each([
    [["--date", "tomorrow"], "status=open&from=2026-09-26&to=2026-09-26"],
    [["--today"], "status=open&to=2026-09-25"],
    [["--from", "-1w", "--to", "+3d"], "status=open&from=2026-09-18&to=2026-09-28"],
    [["--tag", "仕事", "--all"], "status=all&tag=%E4%BB%95%E4%BA%8B"],
    [["--done"], "status=done"],
  ])("%j → ?%s", async (args, query) => {
    await cli.run("list", ...args);
    expect(cli.sent[0]?.url).toBe(`https://todo.example.com/api/v1/todos?${query}`);
  });

  it("解釈できない日付はエラー", async () => {
    const result = await cli.run("list", "--date", "someday", "--json");

    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({
      error: { code: "invalid_argument", message: "日付として解釈できません: someday" },
    });
    expect(cli.sent).toEqual([]);
  });
});

describe("add", () => {
  it("タイトル・タグ・実施日・期限・メモを送る", async () => {
    const cli = await setup();

    const result = await cli.run(
      "add",
      "資料",
      "作成",
      "--tag",
      "仕事",
      "急ぎ",
      "--do",
      "today",
      "--due",
      "+2d",
      "--note",
      "メモ",
    );

    expect(result.code).toBe(0);
    expect(cli.sent[0]).toMatchObject({
      method: "POST",
      url: "https://todo.example.com/api/v1/todos",
      body: { title: "資料 作成", tags: ["仕事", "急ぎ"], doDate: "2026-09-25", dueDate: "2026-09-27", note: "メモ" },
    });
  });
});

describe("update", () => {
  it("指定した項目だけ送り、none で日付を未設定にする", async () => {
    const cli = await setup();

    await cli.run("update", "12", "--title", "新しいタイトル", "--do", "none");

    expect(cli.sent[0]).toMatchObject({
      method: "PATCH",
      url: "https://todo.example.com/api/v1/todos/12",
      body: { title: "新しいタイトル", doDate: null },
    });
  });

  it("--add-tag と --remove-tag は現在のタグを取得してから変更する", async () => {
    const cli = await setup();

    await cli.run("update", "12", "--add-tag", "急ぎ", "--remove-tag", "家");

    expect(cli.sent.map((s) => s.method)).toEqual(["GET", "PATCH"]);
    expect(cli.sent[1]?.body).toEqual({ tags: ["急ぎ"] });
  });

  it("id が数値でなければエラー", async () => {
    const cli = await setup();

    const result = await cli.run("update", "abc", "--title", "a");

    expect(result.code).toBe(1);
    expect(result.stderr).toBe("エラー: id が不正です: abc\n");
  });
});

describe("done / undone / rm", () => {
  it("done は複数の id を完了にする", async () => {
    const cli = await setup();

    await cli.run("done", "1", "2");

    expect(cli.sent.map((s) => [s.method, s.url, s.body])).toEqual([
      ["PATCH", "https://todo.example.com/api/v1/todos/1", { done: true }],
      ["PATCH", "https://todo.example.com/api/v1/todos/2", { done: true }],
    ]);
  });

  it("undone は未完了に戻す", async () => {
    const cli = await setup();
    await cli.run("undone", "1");
    expect(cli.sent[0]?.body).toEqual({ done: false });
  });

  it("rm は削除した id を出力する", async () => {
    const cli = await setup({ respond: () => new Response(null, { status: 204 }) });

    const result = await cli.run("rm", "3", "4", "--json");

    expect(cli.sent.map((s) => s.method)).toEqual(["DELETE", "DELETE"]);
    expect(JSON.parse(result.stdout)).toEqual({ deleted: [3, 4] });
  });
});

describe("show と tags", () => {
  it("show はメモも表示する", async () => {
    const cli = await setup();
    const result = await cli.run("show", "12");
    expect(result.stdout).toBe("#12  [ ]  2026-09-25(金)  買い物  #家  (期限 2026-09-30(水))\n\n牛乳\n");
  });

  it("tags は未完了の件数付きで表示する", async () => {
    const cli = await setup({ respond: () => Response.json([{ id: 1, name: "家", openCount: 3 }]) });
    const result = await cli.run("tags");
    expect(result.stdout).toBe("#家  (未完了 3 件)\n");
  });
});

describe("エラー", () => {
  it("API のエラーをそのまま code と message で返す", async () => {
    const cli = await setup({
      respond: () =>
        Response.json({ error: { code: "not_found", message: "todo 99 が見つかりません" } }, { status: 404 }),
    });

    const result = await cli.run("show", "99", "--json");

    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ error: { code: "not_found", message: "todo 99 が見つかりません" } });
  });

  it("JSON 以外のエラー応答は HTTP ステータスを表示する", async () => {
    const cli = await setup({ respond: () => new Response("<html>", { status: 502 }) });
    const result = await cli.run("list");
    expect(result.stderr).toBe("エラー: サーバーがエラーを返しました (HTTP 502)\n");
  });

  it("接続先が未設定ならエラー", async () => {
    const cli = await setup({ env: {} });

    const result = await cli.run("list", "--json");

    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ error: { code: "not_configured" } });
  });
});

describe("config", () => {
  it("URL とトークンを保存し、トークンは先頭だけ表示する", async () => {
    const cli = await setup({ env: {} });

    const result = await cli.run("config", "--url", "https://todo.example.com", "--token", "tagtodo_0123456789abcdef");

    expect(result.stdout).toContain("URL: https://todo.example.com\nトークン: tagtodo_0123…\n");
    expect(JSON.parse(await readFile(cli.configPath, "utf8"))).toEqual({
      url: "https://todo.example.com",
      token: "tagtodo_0123456789abcdef",
    });
    expect((await stat(cli.configPath)).mode & 0o777).toBe(0o600);
  });

  it("保存した設定で API を呼ぶ", async () => {
    const cli = await setup({ env: {} });
    await cli.run("config", "--url", "https://saved.example.com", "--token", "tagtodo_saved");

    await cli.run("tags");

    expect(cli.sent[0]).toMatchObject({
      url: "https://saved.example.com/api/v1/tags",
      authorization: "Bearer tagtodo_saved",
    });
  });

  it("引数なしなら未設定と表示する", async () => {
    const cli = await setup({ env: {} });
    const result = await cli.run("config", "--json");
    expect(JSON.parse(result.stdout)).toMatchObject({ url: null, token: null });
  });
});
