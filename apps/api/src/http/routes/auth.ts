import { initOidcAuthMiddleware, oidcAuthMiddleware, revokeSession } from "@hono/oidc-auth";
import { Hono, type MiddlewareHandler } from "hono";
import type { AppConfig, OidcConfig } from "../config";
import type { AppEnv } from "../env";

const SESSION_DAYS = 30;

/** @hono/oidc-auth の設定。/auth/* と、Cookie で認証する /api/* で使う */
export function oidcSettings(publicOrigin: string, oidc: OidcConfig): MiddlewareHandler {
  return initOidcAuthMiddleware({
    OIDC_ISSUER: oidc.issuer,
    OIDC_CLIENT_ID: oidc.clientId,
    OIDC_CLIENT_SECRET: oidc.clientSecret,
    OIDC_AUTH_SECRET: oidc.sessionSecret,
    OIDC_REDIRECT_URI: `${publicOrigin}/auth/callback`,
    OIDC_SCOPES: "openid email",
    OIDC_COOKIE_NAME: "tagtodo_session",
    // セッションは 30日で切れる（延長しない）。15分ごとに Cognito にユーザーが有効か確認する（ライブラリの既定値）
    OIDC_AUTH_EXPIRES: String(SESSION_DAYS * 24 * 60 * 60),
  });
}

/**
 * /auth/login    : Cognito のログイン画面へ転送し、ログイン後はトップへ戻る
 * /auth/callback : Cognito からの戻り先。ライブラリがセッション Cookie を発行する
 * /auth/logout   : セッションを削除し、Cognito のログアウトへ転送する
 */
function oidcAuthRoutes(publicOrigin: string, oidc: OidcConfig) {
  return new Hono<AppEnv>()
    .use("*", oidcSettings(publicOrigin, oidc))
    .get("/login", oidcAuthMiddleware(), (c) => c.redirect("/"))
    .get("/callback", oidcAuthMiddleware(), (c) => c.redirect("/"))
    .get("/logout", async (c) => {
      await revokeSession(c);
      const url = new URL(oidc.logoutEndpoint);
      url.searchParams.set("client_id", oidc.clientId);
      url.searchParams.set("logout_uri", `${publicOrigin}/`);
      return c.redirect(url.href);
    });
}

/** 開発モードではログインしないので、どちらもトップへ戻るだけ */
function devAuthRoutes() {
  return new Hono<AppEnv>().get("/login", (c) => c.redirect("/")).get("/logout", (c) => c.redirect("/"));
}

export function authRoutes(config: AppConfig) {
  return config.auth.kind === "oidc" ? oidcAuthRoutes(config.publicOrigin, config.auth.oidc) : devAuthRoutes();
}
