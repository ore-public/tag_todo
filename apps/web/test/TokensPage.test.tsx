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

describe("連携設定画面の API トークン", () => {
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

    const section = screen.getByRole("region", { name: "API トークン" });
    await user.click(within(section).getByRole("button", { name: "失効" }));
    const dialog = screen.getByRole("dialog", { name: "トークンの失効" });
    await user.click(within(dialog).getByRole("button", { name: "失効" }));

    await waitFor(() => {
      expect(api.requests).toContainEqual({ method: "DELETE", path: "/api/tokens/1", body: undefined });
    });
  });
});

describe("連携設定画面のカレンダー連携", () => {
  it("発行したフィードの URL を1回だけ表示し、一覧に追加する", async () => {
    installFakeApi([]);
    const { user } = renderApp();

    await user.type(screen.getByLabelText("フィードの名前"), "Google Calendar{Enter}");

    expect(await screen.findByText("http://localhost:3000/ical/tagtodocal_secret.ics")).toBeInTheDocument();
    const section = screen.getByRole("region", { name: "カレンダー連携" });
    expect(await within(section).findByRole("cell", { name: "Google Calendar" })).toBeInTheDocument();
    const apiSection = screen.getByRole("region", { name: "API トークン" });
    expect(within(apiSection).queryByRole("cell", { name: "Google Calendar" })).not.toBeInTheDocument();
  });

  it("失効ボタンで確認してから失効する", async () => {
    const api = installFakeApi([]);
    const { user } = renderApp();
    await user.type(screen.getByLabelText("フィードの名前"), "スマホ{Enter}");
    const section = screen.getByRole("region", { name: "カレンダー連携" });
    await within(section).findByRole("cell", { name: "スマホ" });

    await user.click(within(section).getByRole("button", { name: "失効" }));
    const dialog = screen.getByRole("dialog", { name: "トークンの失効" });
    await user.click(within(dialog).getByRole("button", { name: "失効" }));

    await waitFor(() => {
      expect(api.requests).toContainEqual({ method: "DELETE", path: "/api/calendar-feeds/1", body: undefined });
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
