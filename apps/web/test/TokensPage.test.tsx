import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi } from "./fakeApi";
import { renderApp } from "./renderApp";

beforeEach(() => {
  window.history.pushState(null, "", "/tokens");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API トークン画面", () => {
  it("発行したトークンを1回だけ表示し、一覧に追加する", async () => {
    installFakeApi([]);
    const { user } = renderApp();

    await user.type(screen.getByLabelText("トークンの名前"), "MacBook{Enter}");

    expect(await screen.findByText("tagtodo_secret")).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "MacBook" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByText("tagtodo_secret")).not.toBeInTheDocument();
  });

  it("失効ボタンで確認してから失効する", async () => {
    const api = installFakeApi([]);
    const { user } = renderApp();
    await user.type(screen.getByLabelText("トークンの名前"), "CLI{Enter}");
    await screen.findByRole("cell", { name: "CLI" });

    await user.click(screen.getByRole("button", { name: "失効" }));
    const dialog = screen.getByRole("dialog", { name: "トークンの失効" });
    await user.click(within(dialog).getByRole("button", { name: "失効" }));

    await waitFor(() => {
      expect(api.requests).toContainEqual({ method: "DELETE", path: "/api/tokens/1", body: undefined });
    });
  });
});

describe("ヘッダー", () => {
  it("ログイン中のメールアドレスを表示し、todo 画面に移動できる", async () => {
    installFakeApi([]);
    const { user } = renderApp();

    expect(await screen.findByText("me@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "todo" }));
    expect(window.location.pathname).toBe("/");
    expect(screen.getByLabelText("todo を追加")).toBeInTheDocument();
  });
});
