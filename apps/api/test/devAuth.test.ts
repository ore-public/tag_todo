import { describe, expect, it } from "vitest";
import { app } from "./helpers";

describe("開発モードのログイン・ログアウト", () => {
  it.each(["/auth/login", "/auth/logout"])("%s はトップへ戻るだけ", async (path) => {
    const res = await app.request(path);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
  });

  it("ヘッダーがなければ既定のユーザーとして扱う", async () => {
    const res = await app.request("/api/me");
    expect(await res.json()).toEqual({ email: "dev@example.com" });
  });
});
