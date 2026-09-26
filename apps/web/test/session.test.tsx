import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeApi } from "./fakeApi";
import { renderApp } from "./renderApp";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ログイン", () => {
  it("ログインしていなければ、ログインへのリンクを表示する", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        Response.json({ error: { code: "unauthorized", message: "ログインしていません" } }, { status: 401 }),
      ),
    );
    renderApp();

    expect(await screen.findByRole("link", { name: "ログイン" })).toHaveAttribute("href", "/auth/login");
  });

  it("サーバーに接続できなければ、そのことを表示する", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent("サーバーに接続できません");
  });

  it("ヘッダーにログアウトのリンクがある", () => {
    installFakeApi([]);
    renderApp();

    expect(screen.getByRole("link", { name: "ログアウト" })).toHaveAttribute("href", "/auth/logout");
  });
});
