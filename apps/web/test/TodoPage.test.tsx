import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, todo } from "./fakeApi";
import { renderApp } from "./renderApp";

// 今日を 2026-09-25 に固定する（setInterval などのタイマーは本物のまま）
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 8, 25, 12, 0) });
  window.history.pushState(null, "", "/");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function selectedTitle(): string | null {
  const selected = document.querySelector('[aria-current="true"]');
  return selected ? within(selected as HTMLElement).getByRole("button").textContent : null;
}

async function renderWithTodos() {
  const api = installFakeApi([
    todo({ id: 1, title: "一つ目", doDate: "2026-09-25" }),
    todo({ id: 2, title: "二つ目", doDate: "2026-09-25", tags: ["仕事"] }),
    todo({ id: 3, title: "三つ目", doDate: "2026-09-26" }),
  ]);
  const { user } = renderApp();
  await screen.findByText("一つ目");
  return { api, user };
}

describe("一覧の表示", () => {
  it("実施日ごとに見出しを付けて表示する", async () => {
    await renderWithTodos();

    expect(screen.getByRole("region", { name: "今日 9/25(金)" })).toHaveTextContent("一つ目二つ目#仕事");
    expect(screen.getByRole("region", { name: "明日 9/26(土)" })).toHaveTextContent("三つ目");
  });
});

describe("キーボード操作", () => {
  it("j / k でカーソルが移動し、端では止まる", async () => {
    const { user } = await renderWithTodos();
    expect(selectedTitle()).toBe("一つ目");

    await user.keyboard("jj");
    expect(selectedTitle()).toBe("三つ目");

    await user.keyboard("j");
    expect(selectedTitle()).toBe("三つ目");

    await user.keyboard("k");
    expect(selectedTitle()).toBe("二つ目");
  });

  it("Ctrl+j で実施日を1日後、Ctrl+k で1日前にする", async () => {
    const { api, user } = await renderWithTodos();

    await user.keyboard("{Control>}j{/Control}");
    await waitFor(() => {
      expect(api.requests).toContainEqual({ method: "PATCH", path: "/api/todos/1", body: { doDate: "2026-09-26" } });
    });
    expect(await screen.findByRole("region", { name: "明日 9/26(土)" })).toHaveTextContent("一つ目");

    await user.keyboard("{Control>}k{/Control}");
    await waitFor(() => {
      expect(api.requests).toContainEqual({ method: "PATCH", path: "/api/todos/1", body: { doDate: "2026-09-25" } });
    });
  });

  it("実施日が未設定の todo に Ctrl+j を押すと今日になる", async () => {
    const api = installFakeApi([todo({ id: 1, title: "日付なし" })]);
    const { user } = renderApp();
    await screen.findByText("日付なし");

    await user.keyboard("{Control>}j{/Control}");

    await waitFor(() => {
      expect(api.requests).toContainEqual({ method: "PATCH", path: "/api/todos/1", body: { doDate: "2026-09-25" } });
    });
  });

  it("x で完了にすると一覧から消える", async () => {
    const { api, user } = await renderWithTodos();

    await user.keyboard("x");

    await waitFor(() => {
      expect(screen.queryByText("一つ目")).not.toBeInTheDocument();
    });
    expect(api.requests).toContainEqual({ method: "PATCH", path: "/api/todos/1", body: { done: true } });
    expect(selectedTitle()).toBe("二つ目");
  });

  it("e で編集ダイアログを開き、保存できる", async () => {
    const { api, user } = await renderWithTodos();

    await user.keyboard("e");
    const dialog = screen.getByRole("dialog", { name: "todo の編集" });
    const title = within(dialog).getByLabelText("タイトル");
    expect(title).toHaveFocus();

    await user.clear(title);
    await user.type(title, "変更後{Enter}");

    await waitFor(() => {
      expect(api.requests).toContainEqual({
        method: "PATCH",
        path: "/api/todos/1",
        body: { title: "変更後", note: "", doDate: "2026-09-25", dueDate: null, tags: [] },
      });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("t で開くとタグの入力欄にフォーカスがある", async () => {
    const { user } = await renderWithTodos();

    await user.keyboard("jt");

    expect(screen.getByLabelText("タグ（空白区切り）")).toHaveFocus();
    expect(screen.getByLabelText("タグ（空白区切り）")).toHaveValue("仕事");
  });

  it("d で確認ダイアログを開き、Enter で削除する", async () => {
    const { api, user } = await renderWithTodos();

    await user.keyboard("d");
    expect(screen.getByRole("dialog", { name: "todo の削除" })).toHaveTextContent("「一つ目」を削除します。");

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.queryByText("一つ目")).not.toBeInTheDocument();
    });
    expect(api.requests).toContainEqual({ method: "DELETE", path: "/api/todos/1", body: undefined });
  });

  it("Escape でダイアログを閉じる", async () => {
    const { user } = await renderWithTodos();

    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: "キーボード操作" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("入力欄で文字を打っている間はショートカットが動かない", async () => {
    const { user } = await renderWithTodos();

    await user.keyboard("o");
    const input = screen.getByLabelText("todo を追加");
    expect(input).toHaveFocus();

    await user.keyboard("jjx");
    expect(input).toHaveValue("jjx");
    expect(selectedTitle()).toBe("一つ目");
  });

  it("c で完了済みの表示を切り替える", async () => {
    const api = installFakeApi([todo({ id: 1, title: "完了済み", done: true })]);
    const { user } = renderApp();
    await screen.findByText("todo はありません");

    await user.keyboard("c");

    expect(await screen.findByText("完了済み")).toBeInTheDocument();
    expect(api.requests.map((r) => r.path)).toContain("/api/todos?status=all");
  });
});

describe("todo の追加", () => {
  it("#タグ・@実施日・!期限を解釈して追加する", async () => {
    const { api, user } = await renderWithTodos();

    await user.type(screen.getByLabelText("todo を追加"), "牛乳 #家 @tomorrow !+3d{Enter}");

    await waitFor(() => {
      expect(api.requests).toContainEqual({
        method: "POST",
        path: "/api/todos",
        body: { title: "牛乳", tags: ["家"], doDate: "2026-09-26", dueDate: "2026-09-28" },
      });
    });
    expect(screen.getByLabelText("todo を追加")).toHaveValue("");
  });

  it("タイトルがないとエラーを表示する", async () => {
    const { user } = await renderWithTodos();

    await user.type(screen.getByLabelText("todo を追加"), "#家{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("タイトルを入力してください");
  });
});

describe("マウス・タップでの操作", () => {
  it("チェックボックスで完了にできる", async () => {
    const { api, user } = await renderWithTodos();

    await user.click(screen.getByLabelText("「二つ目」を完了にする"));

    await waitFor(() => {
      expect(api.requests).toContainEqual({ method: "PATCH", path: "/api/todos/2", body: { done: true } });
    });
  });

  it("タイトルをタップすると編集ダイアログが開き、日付ボタンで実施日を変えられる", async () => {
    const { api, user } = await renderWithTodos();

    await user.click(screen.getByRole("button", { name: "三つ目" }));
    await user.click(screen.getByRole("button", { name: "実施日を1日後にする" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      const patch = api.requests.find((request) => request.path === "/api/todos/3");
      expect(patch?.body).toMatchObject({ doDate: "2026-09-27" });
    });
  });
});
