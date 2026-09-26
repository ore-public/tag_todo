import { getAuth } from "@hono/oidc-auth";
import { createMiddleware } from "hono/factory";
import { AppError } from "../../usecases/errors";
import { resolveUser } from "../../usecases/users";
import type { AppEnv } from "../env";

/**
 * Cognito でログインしたセッション（@hono/oidc-auth の Cookie）で利用者を特定する。
 * API なので、未ログインのときはログイン画面へ転送せず 401 を返す（SPA が /auth/login へ移動する）。
 */
export const sessionAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = await getAuth(c).catch(() => null);
  if (!auth?.sub || typeof auth.email !== "string") throw new AppError("unauthorized", "ログインしていません");
  c.set("userId", await resolveUser(c.var.db, { subject: auth.sub, email: auth.email }));
  await next();
});
